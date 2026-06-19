import { request } from './http'
import type { AuthData, LoginResponse } from './types'

/** Backend: POST /api/v1/auth/login — body: { email } */
export interface LoginRequest {
  email: string
  password?: string
}

/** Backend: POST /api/v1/auth/signup — body: { email, full_name, password, otp } */
export interface SignupRequest {
  email: string
  full_name: string
  password?: string
  otp: string
}

export interface VerifyLoginOtpRequest {
  email: string
  otp: string
}

export interface RegisterOtpRequest {
  email: string
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function verifyLoginOtp(payload: VerifyLoginOtpRequest): Promise<AuthData> {
  return request<AuthData>('/auth/login/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function requestRegisterOtp(payload: RegisterOtpRequest): Promise<{ message: string; otp?: string }> {
  return request<{ message: string; otp?: string }>('/auth/register/request-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginWithMicrosoft(idToken: string): Promise<AuthData> {
  return request<AuthData>('/auth/microsoft', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  })
}

export async function signup(payload: SignupRequest): Promise<AuthData> {
  return request<AuthData>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Alias — backend uses /auth/signup, not /register */
export const register = signup
