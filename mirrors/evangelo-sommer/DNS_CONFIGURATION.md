# DNS Configuration Guide for evangelosommer.com

## Overview
This document explains the DNS configuration for evangelosommer.com and associated service domains, including why certain "warnings" from MXToolbox are expected and can be safely ignored.

---

## Current DNS Configuration

### Domain: evangelosommer.com
**Hosting**: Vercel (website/application)
**DNS Provider**: Bluehost
**Email Service**: SendGrid

### Related Domains:
- woodgreenlandscaping.com
- whiteknightsnowservice.com
- pupawalk.com

---

## SPF Configuration

### Current SPF Record
```
v=spf1 +ip4:162.241.217.72 +include:sendgrid.net ~all
```

### Why This Format?

**Bluehost Requirement**: Bluehost's Email Deliverability tool requires the IP address to be included for the SPF record to be editable via their interface.

**Components Explained**:
- `v=spf1` - SPF version 1
- `+ip4:162.241.217.72` - Bluehost mail server IP (mail.evangelosommer.com)
  - **Note**: This server is blacklisted but NOT actively used for sending
  - Included only for Bluehost UI compatibility
- `+include:sendgrid.net` - SendGrid mail servers (ACTIVE sender)
- `~all` - Soft fail for emails from other sources

### Active Email Sender: SendGrid ONLY
**All legitimate emails** from evangelosommer.com are sent via **SendGrid**:
- Receipt emails: sales@evangelosommer.com
- Support emails: support@evangelosommer.com
- DMARC reports: dmarc-reports@evangelosommer.com

**Blacklisted IP Impact**: NONE
- The Bluehost mail server (162.241.217.72) is NOT used for sending
- Blacklist status is irrelevant to email deliverability
- All emails route through SendGrid's clean infrastructure

---

## DMARC Configuration

### Current DMARC Record
```
v=DMARC1; p=none; rua=mailto:dmarc-reports@evangelosommer.com; pct=100; adkim=r; aspf=r
```

### Status: Monitoring Mode (Phase 1)

**What This Means**:
- `p=none` - No enforcement (monitoring only)
- `rua=` - Aggregate reports sent daily
- `pct=100` - Policy applies to 100% of emails
- `adkim=r` - Relaxed DKIM alignment
- `aspf=r` - Relaxed SPF alignment

### Upgrade Timeline:
- **Week 1-2**: Monitor reports (current: p=none)
- **Week 3-4**: Upgrade to p=quarantine (suspicious → spam)
- **Week 5+**: Upgrade to p=reject (full protection)

**See**: DMARC_UPGRADE_GUIDE.md for full timeline

---

## HTTP 308 Redirect - Expected Behavior

### MXToolbox Warning
```
⚠️ The remote server returned an error: (308) Permanent Redirect
```

### Why This Is NOT a Problem

**Cause**: Vercel Infrastructure
Vercel automatically redirects all HTTP traffic to HTTPS with a 308 status code.

**308 Permanent Redirect Explained**:
- Industry standard for HTTP→HTTPS enforcement
- Indicates "use HTTPS for all future requests"
- Improves security by enforcing encrypted connections
- Cannot be disabled on Vercel (by design)

**This Is Correct Behavior**:
- ✅ Protects user data in transit
- ✅ Required for modern web security
- ✅ Improves SEO (search engines prefer HTTPS)
- ✅ Prevents MITM attacks

**Why MXToolbox Flags It**:
MXToolbox tests the HTTP version (http://evangelosommer.com) and reports the redirect as a "problem." This is a **false positive** - the redirect is working exactly as designed.

**Actual User Experience**:
1. User types `evangelosommer.com` in browser
2. Browser automatically uses HTTPS (due to HSTS)
3. If HTTP is accessed, Vercel redirects to HTTPS
4. User sees secure site with no issues

### HSTS Header (Strict Transport Security)

**Configured in**: `next.config.ts`
```typescript
{
  key: 'Strict-Transport-Security',
  value: 'max-age=63072000; includeSubDomains; preload'
}
```

**What This Does**:
- Tells browsers to ONLY use HTTPS for 2 years (63,072,000 seconds)
- Applies to all subdomains
- Eligible for HSTS preload list (browsers enforce HTTPS before first visit)

---

## MXToolbox Warnings - What to Ignore

### ✅ Safe to Ignore

| Warning | Reason to Ignore |
|---------|-----------------|
| **308 Permanent Redirect** | Correct HTTPS enforcement by Vercel |
| **mail.evangelosommer.com blacklisted** | Not used for sending (SendGrid only) |
| **SMTP connection time** | Old mail server (irrelevant) |
| **"Recommend quarantine/reject policy"** | You're in monitoring phase (intentional) |

### ⚠️ Monitor (Will Resolve Over Time)

| Warning | Timeline |
|---------|----------|
| **DMARC policy not enforced** | Will resolve after upgrade to p=quarantine (Week 3-4) |
| **SPF lookup count** | Already resolved (4-5 lookups, under limit of 10) |

---

## Email Authentication Stack

### Layer 1: SPF (Sender Policy Framework)
- ✅ SendGrid authorized to send
- ✅ Bluehost IP included (UI requirement only)
- ✅ Under DNS lookup limit

### Layer 2: DKIM (DomainKeys Identified Mail)
- ✅ SendGrid DKIM configured
- ✅ s1._domainkey.evangelosommer.com
- ✅ s2._domainkey.evangelosommer.com

### Layer 3: DMARC (Domain-based Message Authentication)
- ✅ Monitoring enabled (p=none)
- ✅ Daily reports to dmarc-reports@evangelosommer.com
- 🔄 Will upgrade to p=quarantine then p=reject

**Result**: Comprehensive email authentication protecting your domain from spoofing.

---

## Vercel Configuration

### Deployment
- **Project ID**: `prj_jtkk1fLiA3yVgjh7FBh0aWNTk9JB`
- **Platform**: Vercel
- **SSL/TLS**: Automatic via Vercel
- **HTTPS Enforcement**: Automatic (308 redirects)

### Next.js Configuration
**File**: `next.config.ts`
- HSTS headers configured
- Security headers set
- No custom redirect logic (uses Vercel defaults)

### Custom Domain Setup
- ✅ evangelosommer.com → Vercel
- ✅ www.evangelosommer.com → Vercel
- ✅ SSL certificates auto-renewed
- ✅ HTTPS enforced globally

---

## DNS Management

### Primary Management: Bluehost cPanel

**Email Deliverability Tool**:
- Location: cPanel → Email → Email Deliverability
- Use for: SPF, DKIM, DMARC configuration
- Format: Must include IP address for SPF

**Zone Editor** (Advanced):
- Location: cPanel → Domains → Zone Editor
- Use for: Manual TXT record editing
- Caution: Bypasses Email Deliverability tool validation

### Recommended Approach
Use **Email Deliverability tool** for all email-related DNS records:
- Validates SPF syntax
- Provides recommendations
- Easier future management
- Maintains compatibility

---

## Verification Commands

### Check SPF Record
```bash
dig TXT evangelosommer.com +short | grep spf
```
**Expected**:
```
"v=spf1 +ip4:162.241.217.72 +include:sendgrid.net ~all"
```

### Check DMARC Record
```bash
dig TXT _dmarc.evangelosommer.com +short
```
**Expected**:
```
"v=DMARC1; p=none; rua=mailto:dmarc-reports@evangelosommer.com; pct=100; adkim=r; aspf=r"
```

### Check DKIM (SendGrid)
```bash
dig CNAME s1._domainkey.evangelosommer.com +short
dig CNAME s2._domainkey.evangelosommer.com +short
```
**Expected**:
```
s1.domainkey.u57016077.wl078.sendgrid.net.
s2.domainkey.u57016077.wl078.sendgrid.net.
```

### Test Email Sending
```bash
node test-sendgrid.js
```
Sends test email via SendGrid to verify configuration.

---

## Troubleshooting

### Emails Not Arriving?

1. **Check SendGrid Activity Feed**
   https://app.sendgrid.com/email_activity
   - Shows delivery status
   - Identifies bounces/blocks

2. **Verify Sender Authentication**
   https://app.sendgrid.com/settings/sender_auth
   - Ensure sales@evangelosommer.com is verified

3. **Check Spam Folder**
   New domains may initially land in spam

4. **Run Test Script**
   ```bash
   node test-sendgrid.js
   ```

### MXToolbox Shows Errors?

**308 Redirect**: Ignore (expected behavior)
**Blacklist Warnings**: Ignore (not sending from that IP)
**DMARC Policy**: Will resolve after upgrade
**DNS Propagation**: Wait 1-24 hours after changes

---

## Quick Reference

### Active Email Infrastructure
- ✅ **Sender**: SendGrid
- ✅ **API Key**: Configured in .env.local
- ✅ **From Addresses**:
  - sales@evangelosommer.com (receipts)
  - support@evangelosommer.com (general)
  - dmarc-reports@evangelosommer.com (monitoring)

### Inactive/Legacy Infrastructure
- ❌ **mail.evangelosommer.com**: Blacklisted, not used
- ❌ **Bluehost SMTP**: Backup only, not active
- ❌ **Direct mail server**: All email via SendGrid

### MXToolbox Interpretation
- ✅ **Green checks**: Good
- ⚠️ **Yellow warnings about 308**: Safe to ignore
- ⚠️ **Blacklist warnings**: Safe to ignore (not used)
- 🔄 **DMARC monitoring**: Will upgrade over time

---

## Related Documentation

- `EMAIL_FIX_INSTRUCTIONS.md` - Sender verification and email troubleshooting
- `DMARC_UPGRADE_GUIDE.md` - Timeline for DMARC policy enforcement
- `DMARC_QUICK_FIX.txt` - Quick reference for DNS updates
- `test-sendgrid.js` - SendGrid configuration test script

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **SendGrid Support**: https://support.sendgrid.com
- **MXToolbox**: https://mxtoolbox.com/SuperTool.aspx
- **DMARC Guide**: https://dmarc.org/overview/

---

**Last Updated**: 2025-11-26
**Maintainer**: Evangelo Sommer Development
**Status**: Production - Fully Operational
