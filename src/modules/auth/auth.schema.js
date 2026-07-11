import { z } from 'zod';

// Email normalizado (trim + lowercase) e senha mínima de 8 caracteres.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email inválido');

const password = z.string().min(8, 'A senha deve ter ao menos 8 caracteres');

export const registerSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Senha obrigatória'),
});

export const googleSchema = z.object({
  idToken: z.string().min(1, 'idToken obrigatório'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken obrigatório'),
});

export const logoutSchema = refreshSchema;
