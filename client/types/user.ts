export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "driver" | "user";
  phone: string;
  createdAt: Date;
}
