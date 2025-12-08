#!/bin/bash
# Verify DMARC and SPF DNS changes

echo "🔍 Verifying DNS changes for evangelosommer.com"
echo "================================================"
echo ""

echo "✅ DMARC Record:"
dig TXT _dmarc.evangelosommer.com +short | grep -i dmarc || echo "❌ DMARC not found"
echo ""

echo "✅ SPF Record:"
dig TXT evangelosommer.com +short | grep -i spf || echo "❌ SPF not found"
echo ""

echo "✅ SendGrid DKIM (s1):"
dig CNAME s1._domainkey.evangelosommer.com +short || echo "❌ DKIM s1 not found"
echo ""

echo "✅ SendGrid DKIM (s2):"
dig CNAME s2._domainkey.evangelosommer.com +short || echo "❌ DKIM s2 not found"
echo ""

echo "================================================"
echo "📝 Next Steps:"
echo "1. Set up dmarc-reports@evangelosommer.com forwarding"
echo "2. Test on MXToolbox: https://mxtoolbox.com/dmarc.aspx"
echo "3. Wait 24-48 hours for first DMARC report"
echo ""
