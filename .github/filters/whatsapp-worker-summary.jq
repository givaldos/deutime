def safe_status:
  if . == "worker executado"
    or . == "dry-run concluído"
    or . == "consumo desligado"
  then .
  else "estado desconhecido"
  end;

def safe_template_status:
  if . == "prontos" or . == "indisponíveis" then . else null end;

def safe_mode:
  if . == "live" or . == "dry-run" then . else null end;

def nonnegative_integer:
  if type == "number" and . >= 0 and floor == . then . else 0 end;

{
  status: (.status | safe_status),
  reminderTemplates: (.reminderTemplates | safe_template_status),
  summary: (
    if (.summary | type) == "object" then
      {
        mode: (.summary.mode | safe_mode),
        automatic: {
          requested: (.summary.automatic.requested == true),
          contractAvailable: (.summary.automatic.contractAvailable == true),
          scannedSlots: (.summary.automatic.scannedSlots | nonnegative_integer),
          enqueuedSlots: (.summary.automatic.enqueuedSlots | nonnegative_integer),
          emptySlots: (.summary.automatic.emptySlots | nonnegative_integer),
          skippedSlots: (.summary.automatic.skippedSlots | nonnegative_integer),
          enqueuedMessages: (.summary.automatic.enqueuedMessages | nonnegative_integer)
        },
        recoveredSafe: (.summary.recoveredSafe | nonnegative_integer),
        recoveredForReview: (.summary.recoveredForReview | nonnegative_integer),
        claimed: (.summary.claimed | nonnegative_integer),
        released: (.summary.released | nonnegative_integer),
        prepared: (.summary.prepared | nonnegative_integer),
        accepted: (.summary.accepted | nonnegative_integer),
        rejected: (.summary.rejected | nonnegative_integer),
        ambiguous: (.summary.ambiguous | nonnegative_integer),
        cancelled: (.summary.cancelled | nonnegative_integer)
      }
    else null
    end
  )
}
