import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      
      const authorizedEmails = process.env.AUTHORIZED_ADMIN_EMAILS 
        ? process.env.AUTHORIZED_ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) 
        : [];
        
      if (authorizedEmails.includes(user.email.toLowerCase())) {
        return true;
      } else {
        // Return false to display a default Access Denied page
        console.warn(`[SSO Blocked] Unauthorized login attempt from: ${user.email}`);
        return false;
      }
    },
  },
  pages: {
    // Optionally we can define a custom error/login page here, 
    // but the default NextAuth pages are fine for super-admins.
    error: '/api/auth/error', 
  }
})

export { handler as GET, handler as POST }
