export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

export function getEmailError(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!isValidEmail(email)) return "Enter a valid email address";
  return null;
}

export function getPasswordError(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

export function getNameError(name: string): string | null {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  return null;
}

// ─── Store field validators ───────────────────────────────────────────────

export function getStoreNameError(name: string): string | null {
  if (!name.trim()) return "Store name is required";
  if (name.trim().length < 2) return "Store name must be at least 2 characters";
  if (name.trim().length > 100) return "Store name must be under 100 characters";
  return null;
}

export function getPhoneError(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "Phone number is required";
  if (digits.length !== 10) return "Phone number must be exactly 10 digits";
  return null;
}

export function getAddressError(address: string): string | null {
  if (!address.trim()) return "Address is required";
  if (address.trim().length < 5) return "Address must be at least 5 characters";
  return null;
}

export function getDescriptionError(description: string): string | null {
  if (!description.trim()) return "Description is required";
  if (description.trim().length < 10) return "Description must be at least 10 characters";
  if (description.trim().length > 1000) return "Description must be under 1000 characters";
  return null;
}
