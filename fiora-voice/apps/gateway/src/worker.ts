import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

const prisma = new PrismaClient();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const provisioningWorker = new Worker('provision-tenant', async (job: Job) => {
  const { tenantId, adminId = 'system-auto-provision' } = job.data;

  let tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found');
  
  if (tenant.provisioning_status === 'ACTIVE' || tenant.twilio_subaccount_sid) {
    console.log(`[PROVISIONING] Tenant ${tenantId} is already provisioned.`);
    return { success: true, message: 'Already provisioned' };
  }

  // 1. Enter PROVISIONING state
  tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { provisioning_status: 'PROVISIONING', provisioning_error: null }
  });

  if (!accountSid || !authToken) throw new Error('System Twilio credentials missing');
  
  const client = twilio(accountSid, authToken);
  let subaccount;

  try {
    // 2. Create Subaccount
    subaccount = await client.api.v2010.accounts.create({
      friendlyName: `FIORA_${tenant.name}_${tenant.id}`
    });
    
    const subClient = twilio(subaccount.sid, subaccount.authToken);
    
    // 3. Search and Purchase Number
    const searchParams: any = { limit: 1 };
    if (tenant.preferred_area_code) searchParams.areaCode = tenant.preferred_area_code;

    const availableNumbers = await subClient.availablePhoneNumbers(tenant.country_code).local.list(searchParams);
    
    if (availableNumbers.length === 0) {
      throw new Error(`No phone numbers available in region ${tenant.country_code} ${tenant.preferred_area_code ? 'for area code ' + tenant.preferred_area_code : ''}`);
    }

    const purchasedNumber = await subClient.incomingPhoneNumbers.create({
      phoneNumber: availableNumbers[0].phoneNumber,
    });

    // 4. Update Database on Success
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { 
        twilio_subaccount_sid: subaccount.sid,
        provisioning_status: 'ACTIVE'
      }
    });

    await prisma.phoneNumber.create({
      data: {
        tenant_id: tenantId,
        phone_number: purchasedNumber.phoneNumber,
        business_name: tenant.name
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        tenant_id: tenantId,
        admin_user_id: adminId,
        action: 'PROVISION_TWILIO_SUBACCOUNT',
        new_value: { subaccount_sid: subaccount.sid, phone_number: purchasedNumber.phoneNumber }
      }
    });

    console.log(`[PROVISIONING] Successfully provisioned tenant ${tenantId}. Number: ${purchasedNumber.phoneNumber}`);
    return { success: true, subaccountSid: subaccount.sid, phoneNumber: purchasedNumber.phoneNumber };

  } catch (apiErr: any) {
    // Clean up orphaned subaccount if possible
    if (subaccount) {
      try {
        await client.api.v2010.accounts(subaccount.sid).update({ status: 'closed' });
      } catch (cleanupErr) {
        console.error('[PROVISIONING CLEANUP ERROR]', cleanupErr);
      }
    }
    
    // Update Database with FAILED status
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { provisioning_status: 'FAILED', provisioning_error: apiErr.message }
    });
    
    throw new Error(`Twilio Provisioning Failed: ${apiErr.message}`);
  }
}, { connection: { host: 'localhost', port: 6379 } });

provisioningWorker.on('completed', job => {
  console.log(`Job with id ${job.id} has been completed`);
});

provisioningWorker.on('failed', (job, err) => {
  console.error(`Job with id ${job?.id} has failed with ${err.message}`);
});
