# DMARC Upgrade Guide for evangelosommer.com

## Current Status
- DMARC Policy: `p=none` (No Protection)
- SendGrid: Configured and working
- SPF: Configured (needs cleanup - 11 lookups)
- DKIM: Configured via SendGrid

## Safe Upgrade Path

### Phase 1: Enable DMARC Reporting (Week 1)

**Current Record:**
```
v=DMARC1; p=none;
```

**New Record (with reporting):**
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@evangelosommer.com; ruf=mailto:dmarc-forensic@evangelosommer.com; pct=100; adkim=r; aspf=r
```

**What this does:**
- `p=none` - Still no blocking (monitoring only)
- `rua=` - Aggregate reports sent to this email
- `ruf=` - Forensic (failure) reports sent here
- `pct=100` - Apply policy to 100% of emails
- `adkim=r` - Relaxed DKIM alignment
- `aspf=r` - Relaxed SPF alignment

**How to Update:**
1. Log into your DNS provider (where evangelosommer.com DNS is hosted)
2. Find the `_dmarc` TXT record
3. Update the value to the "New Record" above
4. Save changes (propagation takes 5-60 minutes)

**Action Required:**
- Set up email forwarding or create these mailboxes:
  - `dmarc-reports@evangelosommer.com`
  - `dmarc-forensic@evangelosommer.com`

---

### Phase 2: Quarantine Policy (Week 2)

**After 1 week of monitoring reports:**

Check your DMARC reports for:
- ✅ All legitimate emails passing DMARC
- ❌ Any failures from expected senders

**If reports look good, update to:**
```
v=DMARC1; p=quarantine; pct=10; rua=mailto:dmarc-reports@evangelosommer.com; ruf=mailto:dmarc-forensic@evangelosommer.com; adkim=r; aspf=r
```

**What changed:**
- `p=quarantine` - Suspicious emails go to spam
- `pct=10` - Start with only 10% of emails

**Monitor for 3-5 days, then increase:**
- Day 3: `pct=25`
- Day 5: `pct=50`
- Day 7: `pct=75`
- Day 10: `pct=100`

---

### Phase 3: Reject Policy (Week 3-4)

**After quarantine is at 100% for 1 week with no issues:**

```
v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@evangelosommer.com; ruf=mailto:dmarc-forensic@evangelosommer.com; adkim=r; aspf=r
```

**What changed:**
- `p=reject` - Suspicious emails are completely blocked
- Maximum protection against spoofing

---

## Quick Start: DNS Update Instructions

### Find Your DNS Provider

Your domain `evangelosommer.com` is hosted at: **Bluehost** (based on nameservers)

### Update DMARC Record

1. **Log into Bluehost cPanel**
   - Go to: https://my.bluehost.com/
   - Navigate to: Domains → Zone Editor

2. **Find the _dmarc TXT record**
   - Look for: `_dmarc.evangelosommer.com`
   - Current value: `v=DMARC1; p=none;`

3. **Update the value to:**
   ```
   v=DMARC1; p=none; rua=mailto:dmarc-reports@evangelosommer.com; ruf=mailto:dmarc-forensic@evangelosommer.com; pct=100; adkim=r; aspf=r
   ```

4. **Save Changes**
   - TTL: 3600 (1 hour)
   - Click "Save" or "Update Record"

5. **Verify (wait 15-60 minutes):**
   ```bash
   dig TXT _dmarc.evangelosommer.com +short
   ```
   Should show the new record.

---

## Create DMARC Report Mailboxes

### Option 1: Email Forwarding (Easiest)
1. In cPanel → Email → Forwarders
2. Create forwarder: `dmarc-reports@evangelosommer.com` → `support@evangelosommer.com`
3. Create forwarder: `dmarc-forensic@evangelosommer.com` → `support@evangelosommer.com`

### Option 2: Use DMARC Report Service (Recommended)
Free services that parse DMARC reports:
- **Postmark DMARC Digests**: https://dmarc.postmarkapp.com/ (Free)
- **DMARC Analyzer**: https://www.dmarcanalyzer.com/ (Free tier)
- **URI DMARC**: https://uri.services/dmarc (Free)

Example with Postmark:
```
rua=mailto:re+abc123xyz@dmarc.postmarkapp.com
```

---

## Bonus: Fix SPF Lookup Limit

**Current SPF (11 lookups - EXCEEDS LIMIT):**
```
v=spf1 a mx include:sendgrid.net include:websitewelcome.com ~all
```

**Recommended SPF (3 lookups):**
```
v=spf1 include:sendgrid.net ~all
```

**Why:** You're only sending via SendGrid now, so other includes aren't needed.

**How to Update:**
1. Same place as DMARC (cPanel → Zone Editor)
2. Find evangelosommer.com TXT record (no subdomain)
3. Update SPF value
4. Save

---

## Testing & Monitoring

### Test DMARC After Update
- https://mxtoolbox.com/dmarc.aspx
- Enter: `evangelosommer.com`
- Should show policy and reporting addresses

### Monitor Reports Weekly
- Check `dmarc-reports@evangelosommer.com` inbox
- Reports arrive daily (usually from major providers)
- Look for `PASS` vs `FAIL` counts

### Expected Timeline
- **Week 1**: p=none with reporting (monitoring)
- **Week 2**: p=quarantine at 10%, increase to 100%
- **Week 3**: p=quarantine at 100% (monitoring)
- **Week 4**: p=reject at 100% (full protection)

---

## Red Flags to Watch For

### STOP if you see:
- Legitimate emails failing DMARC
- Client complaints about missing emails
- Important services (accounting, CRM) being blocked

### Continue if:
- Only spam/phishing attempts failing
- All SendGrid emails passing
- No legitimate sender failures

---

## Final Target Configuration

### DMARC (Maximum Protection):
```
v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@evangelosommer.com; adkim=r; aspf=r; fo=1
```

### SPF (Simplified):
```
v=spf1 include:sendgrid.net ~all
```

### DKIM:
Already configured via SendGrid (no changes needed)

---

## Verification Checklist

- [ ] DMARC record updated with reporting
- [ ] Email forwarding set up for DMARC reports
- [ ] Received first DMARC report (within 24-48 hours)
- [ ] SPF lookups reduced from 11 to ~3
- [ ] Monitored reports for 1 week (all legitimate emails passing)
- [ ] Upgraded to p=quarantine (gradual rollout)
- [ ] Monitored quarantine for 1 week (no issues)
- [ ] Upgraded to p=reject (full protection)
- [ ] Verified on MXToolbox: https://mxtoolbox.com/dmarc.aspx

---

## Support Resources

- **DMARC Guide**: https://dmarc.org/overview/
- **MXToolbox DMARC**: https://mxtoolbox.com/dmarc.aspx
- **SendGrid DMARC Guide**: https://docs.sendgrid.com/ui/account-and-settings/dmarc
- **Test Email Auth**: https://www.mail-tester.com/

---

**Start with Phase 1 immediately** - it's safe and enables monitoring!
