terraform {
  required_version = ">= 1.11.0, < 2.0.0"

  # Reservado para o futuro backend remoto. No MVP o workflow usa
  # init -backend=false e nunca executa plan/apply contra produção.
  cloud {}

  required_providers {
    github = {
      source  = "integrations/github"
      version = "6.12.1"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "1.9.1"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "5.3.0"
    }
  }
}

provider "github" {
  owner = var.github_owner
}

provider "supabase" {}

provider "vercel" {
  team = var.vercel_team
}
