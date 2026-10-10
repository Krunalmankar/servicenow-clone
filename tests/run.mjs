// Runs the test suite against a throwaway SQLite database (works on macOS, Linux and Windows).
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env, DATABASE_URL: "file:./test.db" };
const run = (cmd) => execSync(cmd, { stdio: "inherit", env });

// The test database lives next to the schema and is recreated from scratch on every run.
rmSync("prisma/test.db", { force: true });
rmSync("prisma/test.db-journal", { force: true });
run("npx prisma db push --skip-generate");
run("npx tsx prisma/seed.ts");
run("npx tsx --test tests/*.test.ts");
