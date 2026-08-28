{
  status,
  summary: {
    claimed: (.summary.claimed // 0),
    prepared: (.summary.prepared // 0),
    accepted: (.summary.accepted // 0),
    transient: (.summary.transient // 0),
    permanent: (.summary.permanent // 0),
    ambiguous: (.summary.ambiguous // 0),
    skipped: (.summary.skipped // 0),
    recovered: (.summary.recovered // 0),
    review: (.summary.review // 0)
  }
}
