import { combineReducers } from '@reduxjs/toolkit';
import authSlice from '../../features/auth/store/authSlice';

export const rootReducer = combineReducers({
  auth: authSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
