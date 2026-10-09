import test from "node:test";
import assert from "node:assert/strict";
import { hasOrganizationFeature } from "../src/middlewares/rbac.middleware.js";

test("administration_security enables its documented feature set", () => {
  const allowedFeatures = ["administration_security"];

  assert.equal(hasOrganizationFeature(allowedFeatures, "villas"), true);
  assert.equal(hasOrganizationFeature(allowedFeatures, "users"), true);
  assert.equal(hasOrganizationFeature(allowedFeatures, "roles"), true);
  assert.equal(hasOrganizationFeature(allowedFeatures, "notices"), false);
});
