locals {
  repository_full_name = "${var.github_owner}/${var.github_repository}"
  supabase_url         = "https://${supabase_project.production.id}.supabase.co"
}

resource "supabase_project" "production" {
  organization_id         = var.supabase_organization_id
  name                    = "deutime-production"
  database_password       = var.supabase_database_password
  region                  = var.supabase_region
  instance_size           = var.supabase_instance_size
  legacy_api_keys_enabled = false

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [database_password]
  }
}

resource "supabase_settings" "production" {
  project_ref = supabase_project.production.id

  database = jsonencode({
    statement_timeout = "10s"
  })

  api = jsonencode({
    db_schema            = "public,storage,graphql_public"
    db_extra_search_path = "public,extensions"
    max_rows             = 1000
  })

  auth = jsonencode({
    site_url                                               = var.app_url
    uri_allow_list                                         = "${var.app_url}/auth/confirm,${var.app_url}/auth/recovery"
    disable_signup                                         = false
    jwt_exp                                                = 3600
    mailer_autoconfirm                                     = false
    mailer_secure_email_change_enabled                     = true
    mailer_otp_exp                                         = 600
    mailer_otp_length                                      = 6
    mailer_subjects_confirmation                           = "Confirme seu e-mail — DeuTime"
    mailer_templates_confirmation_content                  = file("${path.module}/../../supabase/templates/confirmation.html")
    mailer_subjects_recovery                               = "Redefina sua senha — DeuTime"
    mailer_templates_recovery_content                      = file("${path.module}/../../supabase/templates/recovery.html")
    mailer_notifications_password_changed_enabled          = true
    mailer_subjects_password_changed_notification          = "Sua senha foi alterada — DeuTime"
    mailer_templates_password_changed_notification_content = file("${path.module}/../../supabase/templates/password-changed.html")
    smtp_admin_email                                       = var.smtp_admin_email
    smtp_host                                              = var.smtp_host
    smtp_port                                              = var.smtp_port
    smtp_user                                              = var.smtp_user
    smtp_pass                                              = var.smtp_password
    smtp_sender_name                                       = var.smtp_sender_name
    smtp_max_frequency                                     = 60
    rate_limit_email_sent                                  = var.auth_email_rate_limit
    password_min_length                                    = 12
    refresh_token_rotation_enabled                         = true
    external_phone_enabled                                 = true
    sms_autoconfirm                                        = false
    sms_max_frequency                                      = 60
    sms_otp_exp                                            = 600
    sms_otp_length                                         = 6
    sms_provider                                           = "twilio"
    sms_template                                           = "Seu código DeuTime é {{ .Code }}"
    sms_twilio_account_sid                                 = var.twilio_account_sid
    sms_twilio_auth_token                                  = var.twilio_auth_token
    sms_twilio_message_service_sid                         = var.twilio_message_service_sid
    security_captcha_enabled                               = true
    security_captcha_provider                              = "turnstile"
    security_captcha_secret                                = var.turnstile_secret_key
    security_manual_linking_enabled                        = false
    security_update_password_require_reauthentication      = true
  })

  storage = jsonencode({
    fileSizeLimit = 5242880
    features = {
      imageTransformation = { enabled = false }
      s3Protocol          = { enabled = false }
    }
  })
}

data "supabase_apikeys" "production" {
  project_ref = supabase_project.production.id
  depends_on  = [supabase_settings.production]
}

resource "vercel_project" "production" {
  name                                              = "deutime"
  framework                                         = "nextjs"
  node_version                                      = "24.x"
  git_fork_protection                               = true
  public_source                                     = false
  automatically_expose_system_environment_variables = false

  git_repository = {
    type = "github"
    repo = local.repository_full_name
  }
}

resource "vercel_project_environment_variable" "supabase_url" {
  project_id = vercel_project.production.id
  key        = "NEXT_PUBLIC_SUPABASE_URL"
  value_wo   = local.supabase_url
  target     = ["production"]
  sensitive  = true
  comment    = "Managed by Terraform. Public at runtime despite provider sensitivity."
}

resource "vercel_project_environment_variable" "supabase_publishable_key" {
  project_id = vercel_project.production.id
  key        = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  value_wo   = data.supabase_apikeys.production.publishable_key
  target     = ["production"]
  sensitive  = true
  comment    = "Managed by Terraform. Public browser key; authorization still relies on RLS."
}

resource "vercel_project_environment_variable" "supabase_secret_key" {
  project_id = vercel_project.production.id
  key        = "SUPABASE_SECRET_KEY"
  value_wo   = data.supabase_apikeys.production.secret_keys[0].api_key
  target     = ["production"]
  sensitive  = true
  comment    = "Server-only key that bypasses RLS. Never expose or log."
}

resource "vercel_project_environment_variable" "app_url" {
  project_id = vercel_project.production.id
  key        = "APP_URL"
  value_wo   = var.app_url
  target     = ["production"]
  sensitive  = true
  comment    = "Canonical production origin."
}

resource "vercel_project_environment_variable" "turnstile_site_key" {
  project_id = vercel_project.production.id
  key        = "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
  value_wo   = var.turnstile_site_key
  target     = ["production"]
  sensitive  = true
  comment    = "Turnstile browser site key."
}

resource "vercel_project_environment_variable" "turnstile_secret_key" {
  project_id = vercel_project.production.id
  key        = "TURNSTILE_SECRET_KEY"
  value_wo   = var.turnstile_secret_key
  target     = ["production"]
  sensitive  = true
  comment    = "Turnstile server verification key."
}

resource "vercel_project_environment_variable" "aws_region" {
  project_id = vercel_project.production.id
  key        = "AWS_REGION"
  value_wo   = var.aws_ses_region
  target     = ["production"]
  sensitive  = true
  comment    = "AWS region for the SES v2 registration-email worker."
}

resource "vercel_project_environment_variable" "aws_access_key_id" {
  project_id = vercel_project.production.id
  key        = "AWS_ACCESS_KEY_ID"
  value_wo   = var.aws_ses_access_key_id
  target     = ["production"]
  sensitive  = true
  comment    = "Least-privilege IAM key for ses:SendEmail."
}

resource "vercel_project_environment_variable" "aws_secret_access_key" {
  project_id = vercel_project.production.id
  key        = "AWS_SECRET_ACCESS_KEY"
  value_wo   = var.aws_ses_secret_access_key
  target     = ["production"]
  sensitive  = true
  comment    = "Secret for the least-privilege SES IAM key. Never expose or log."
}

resource "vercel_project_environment_variable" "aws_session_token" {
  count      = var.aws_ses_session_token == null ? 0 : 1
  project_id = vercel_project.production.id
  key        = "AWS_SESSION_TOKEN"
  value_wo   = var.aws_ses_session_token
  target     = ["production"]
  sensitive  = true
  comment    = "Optional token for temporary AWS credentials."
}

resource "vercel_project_environment_variable" "ses_from_email" {
  project_id = vercel_project.production.id
  key        = "SES_FROM_EMAIL"
  value_wo   = var.smtp_admin_email
  target     = ["production"]
  sensitive  = true
  comment    = "From address verified in AWS SES."
}

resource "vercel_project_environment_variable" "ses_sender_name" {
  project_id = vercel_project.production.id
  key        = "SES_SENDER_NAME"
  value_wo   = var.smtp_sender_name
  target     = ["production"]
  sensitive  = true
  comment    = "Sender name for AWS SES transactional notices."
}

resource "vercel_project_environment_variable" "ses_configuration_set" {
  project_id = vercel_project.production.id
  key        = "SES_CONFIGURATION_SET"
  value_wo   = var.aws_ses_configuration_set
  target     = ["production"]
  sensitive  = true
  comment    = "SES configuration set for delivery, bounce and complaint observability."
}

resource "github_repository_ruleset" "main" {
  count       = var.enable_github_ruleset ? 1 : 0
  name        = "main-protection"
  repository  = var.github_repository
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["~DEFAULT_BRANCH"]
      exclude = []
    }
  }

  rules {
    deletion                = true
    non_fast_forward        = true
    required_linear_history = true

    pull_request {
      allowed_merge_methods             = ["squash"]
      dismiss_stale_reviews_on_push     = true
      require_code_owner_review         = var.required_approvals > 0
      require_last_push_approval        = var.required_approvals > 0
      required_approving_review_count   = var.required_approvals
      required_review_thread_resolution = true
    }

    required_status_checks {
      strict_required_status_checks_policy = true

      required_check { context = "quality" }
      required_check { context = "database" }
      required_check { context = "dependency-review" }
      required_check { context = "analyze-javascript-typescript" }
      required_check { context = "terraform-check" }
    }
  }
}
