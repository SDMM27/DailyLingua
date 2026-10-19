import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

export const signInSchema = z.object({
  email: z.email("Adresse e-mail invalide").trim(),
  password: z.string().min(1, "Le mot de passe est obligatoire"),
});

export const signUpSchema = z.object({
  email: z.email("Adresse e-mail invalide").trim(),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Au moins ${MIN_PASSWORD_LENGTH} caractères`).max(72),
});

export const requestPasswordResetSchema = z.object({
  email: z.email("Adresse e-mail invalide").trim(),
});

export const upgradeGuestSchema = z.object({
  email: z.email("Adresse e-mail invalide").trim(),
});

export const updatePasswordSchema = z
  .object({
    password: signUpSchema.shape.password,
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    message: "Les deux mots de passe ne correspondent pas",
    path: ["confirmation"],
  });
