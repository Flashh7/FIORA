import { logger as baseLogger } from './index';

export interface RuntimeLogContext {
  execution_id: string;
  correlation_id: string;
  sequence_number?: number;
  execution_mode?: string;
  service_name: string;
  [key: string]: any;
}

export const createRuntimeLogger = (context: RuntimeLogContext) => {
  return baseLogger.child(context);
};
