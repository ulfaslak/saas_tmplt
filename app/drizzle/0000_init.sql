CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text UNIQUE,
	"emailVerified" timestamp,
	"image" text,
	"job_title" text
);

CREATE TABLE "account" (
	"userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	PRIMARY KEY ("provider", "providerAccountId")
);

CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY,
	"userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"expires" timestamp NOT NULL
);

CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	PRIMARY KEY ("identifier", "token")
);

CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text UNIQUE,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now(),
	"deleted_at" timestamptz
);

CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
	"org_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"role" text NOT NULL DEFAULT 'admin',
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"email" text NOT NULL,
	"token" text NOT NULL UNIQUE,
	"role" text NOT NULL,
	"created_by" uuid REFERENCES "user"("id"),
	"used_by" uuid REFERENCES "user"("id"),
	"expires_at" timestamptz NOT NULL,
	"revoked_at" timestamptz,
	"created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"name" text NOT NULL,
	"key_hash" text NOT NULL UNIQUE,
	"key_prefix" text NOT NULL,
	"created_by" uuid NOT NULL REFERENCES "user"("id"),
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"last_used_at" timestamptz
);

CREATE TABLE "impersonation_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
	"target_user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"expires_at" timestamptz NOT NULL
);
