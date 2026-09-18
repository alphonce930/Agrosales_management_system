import { query } from "./db.js";
import { hashPassword } from "../utils/helpers.js";

const getBootstrapUsers = () => [
  {
    email: (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase(),
    password: process.env.SUPER_ADMIN_PASSWORD || "",
    fullName: "Super Administrator",
    usernameFallback: "superadmin",
    role: "super_admin",
    phone: "+255700000000",
  },
  {
    email: (process.env.ADMIN_EMAIL || "").trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "",
    fullName: "System Administrator",
    usernameFallback: "admin",
    role: "admin",
    phone: "+255700000001",
  },
];

export const seedBootstrapUsers = async () => {
  for (const user of getBootstrapUsers()) {
    if (!user.email || !user.password) {
      console.warn(
        `${user.role} bootstrap is skipped until its email and password are configured.`,
      );
      continue;
    }

    const username = (
      user.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") ||
      user.usernameFallback
    ).slice(0, 40);
    const rows = await query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, user.email],
    );

    if (rows.length > 0) {
      console.log(`${user.role} account already exists. Skipping creation.`);
      continue;
    }

    const passwordHash = await hashPassword(user.password);

    await query(
      `INSERT INTO users
        (full_name, username, email, phone, location, password, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.fullName,
        username,
        user.email,
        user.phone,
        "Dar es Salaam",
        passwordHash,
        user.role,
        "verified",
      ],
    );

    console.log(`${user.role} account created successfully.`);
  }
};
