import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run cleanup every day at 2 AM UTC
crons.daily(
    "cleanup old document versions",
    { hourUTC: 2, minuteUTC: 0 },
    internal.documentVersions.cleanupAllOldVersions
);

export default crons;
