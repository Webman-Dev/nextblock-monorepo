"use server";

import { encodedRedirect } from "@nextblock-cms/utils/server";
import { createClient } from "@nextblock-cms/db/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolvePostAuthRedirect } from "../lib/auth-redirects";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const nextPublicUrl = process.env.NEXT_PUBLIC_URL;
  const redirectBase = nextPublicUrl
    ? nextPublicUrl.startsWith("http")
      ? nextPublicUrl
      : `https://${nextPublicUrl}`
    : origin;

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${redirectBase}/auth/callback?redirect_to=/profile`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);

    if (error.message.toLowerCase().includes("rate limit")) {
      return encodedRedirect(
        "error",
        "/sign-up",
        "auth.signup_rate_limit"
      );
    }

    if (error.message.toLowerCase().includes("already")) {
      return encodedRedirect(
        "error",
        "/sign-up",
        "auth.signup_existing_account_hint"
      );
    }

    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "auth.signup_check_email_profile",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const requestedRedirect = formData.get("redirect")?.toString();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();

    const nextPath = resolvePostAuthRedirect(profile ?? null, requestedRedirect);
    return redirect(`/post-sign-in?redirect_to=${encodeURIComponent(nextPath)}`);
  }

  return redirect("/post-sign-in");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const nextPublicUrl = process.env.NEXT_PUBLIC_URL;
  const redirectBase = nextPublicUrl
    ? nextPublicUrl.startsWith("http")
      ? nextPublicUrl
      : `https://${nextPublicUrl}`
    : origin;
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${redirectBase}/auth/callback?redirect_to=/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/");
};
