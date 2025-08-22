import { adminAPI } from './admin_api';
import { studentAPI } from './student_api';
// @ts-ignore
import { setupAuthInterceptors } from './authservices_api';

// Apply authentication and RBAC interceptors to adminAPI
if (adminAPI && typeof setupAuthInterceptors === 'function') {
  setupAuthInterceptors(adminAPI);
}

export { adminAPI };
