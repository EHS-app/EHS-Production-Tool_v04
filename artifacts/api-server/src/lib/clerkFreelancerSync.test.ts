import assert from "node:assert/strict";
import test from "node:test";
import { legacyFreelancerIdentity } from "./clerkFreelancerSync";
import { hasVerifiedPrimaryEhsEmail } from "../middleware/userType";

test("legacy freelancer identity handles missing names safely", () => {
  assert.deepEqual(
    legacyFreelancerIdentity({
      id: "user_external",
      firstName: null,
      lastName: null,
      username: null,
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "legacy.freelancer@example.com",
        },
      ],
    }),
    {
      fullName: "legacy.freelancer",
      email: "legacy.freelancer@example.com",
    },
  );
});

test("legacy freelancer identity falls back through username and user id", () => {
  assert.equal(
    legacyFreelancerIdentity({
      id: "user_external",
      username: "legacy-user",
      emailAddresses: [],
    }).fullName,
    "legacy-user",
  );
  assert.equal(
    legacyFreelancerIdentity({
      id: "user_abcdef",
      emailAddresses: [],
    }).fullName,
    "Freelancer abcdef",
  );
});

test("only a verified primary EHS email is classified as employee", () => {
  assert.equal(
    hasVerifiedPrimaryEhsEmail({
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "crew@ehs.no",
          verification: { status: "verified" },
        },
      ],
    }),
    true,
  );
  assert.equal(
    hasVerifiedPrimaryEhsEmail({
      primaryEmailAddressId: "email_1",
      emailAddresses: [
        {
          id: "email_1",
          emailAddress: "crew@example.com",
          verification: { status: "verified" },
        },
      ],
    }),
    false,
  );
});