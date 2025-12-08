import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import sgMail from '@sendgrid/mail'
import { getServiceEmailConfig, ServiceEmailConfig, resolveServiceLineId } from '@/lib/service-email-config'
import { logTestimonialRequested } from '@/lib/activity-logger'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

// POST /api/testimonials/send-request - Send testimonial request to client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, serviceId, serviceName, message } = body

    // Validate required fields
    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing required field: clientId' },
        { status: 400 }
      )
    }

    // Fetch client details
    const client = await prisma!.clientRecord.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!client.email) {
      return NextResponse.json(
        { error: 'Client does not have an email address' },
        { status: 400 }
      )
    }

    // Create a pending testimonial request
    const testimonial = await prisma!.testimonial.create({
      data: {
        clientId,
        serviceId,
        serviceName,
        rating: 0, // Placeholder, will be filled when client submits
        content: '', // Placeholder, will be filled when client submits
        status: 'PENDING',
        requestSentAt: new Date(),
        source: 'email',
      },
    })

    // Resolve service type to service line (e.g., 'leaf_removal' -> 'woodgreen')
    const serviceLineId = resolveServiceLineId(serviceId)

    // Get service-specific email configuration using resolved service line
    const serviceConfig = getServiceEmailConfig(serviceLineId)

    // Generate the testimonial form link pointing to service website
    // Each service site has its own testimonial form that proxies to the CRM
    const formLink = `${serviceConfig.websiteUrl}/testimonials/submit/${testimonial.id}`

    // Send email to client with testimonial form link
    try {
      const emailHtml = generateTestimonialRequestEmail(
        client.name,
        serviceName || serviceConfig.name,
        formLink,
        message,
        serviceConfig
      )

      await sgMail.send({
        to: client.email,
        from: serviceConfig.feedbackEmail,
        subject: `We'd love your feedback on ${serviceName || serviceConfig.name}!`,
        html: emailHtml,
      })

      console.log(`Testimonial request email sent to ${client.email} from ${serviceConfig.feedbackEmail}`)

      // Log activity after successful email send
      try {
        await logTestimonialRequested({
          testimonialId: testimonial.id,
          clientId,
          clientName: client.name,
          serviceName: serviceName || serviceConfig.name,
          userId: session?.user?.email || undefined,
          userName: session?.user?.name || undefined,
        });
      } catch (logError) {
        console.error('Failed to log testimonial request activity:', logError);
        // Don't fail the request if activity logging fails
      }
    } catch (emailError) {
      console.error('Error sending testimonial request email:', emailError)
      // Don't fail the request if email fails - the record is still created
    }

    return NextResponse.json({
      success: true,
      message: 'Testimonial request created and email sent successfully',
      testimonial: {
        id: testimonial.id,
        clientId: testimonial.clientId,
        status: testimonial.status,
        requestSentAt: testimonial.requestSentAt,
      },
      // Include form link that can be sent to client
      formLink: `/testimonials/submit/${testimonial.id}`,
    })
  } catch (error) {
    console.error('Error sending testimonial request:', error)
    return NextResponse.json(
      { error: 'Failed to send testimonial request' },
      { status: 500 }
    )
  }
}

// Generate testimonial request email HTML with service-specific branding
function generateTestimonialRequestEmail(
  clientName: string,
  serviceName: string,
  formLink: string,
  customMessage: string | undefined,
  serviceConfig: ServiceEmailConfig
): string {
  const headerColor = serviceConfig.primaryColor
  const buttonColor = serviceConfig.primaryColor
  const accentColor = '#D4AF37' // Unified Evangelo Sommer gold for footer

  // Build absolute URL for logo (for email compatibility)
  // Use inverse logo for dark header background, regular logo otherwise
  // Logos are hosted on each service's website
  const logoPath = serviceConfig.logoInversePath || serviceConfig.logoPath
  const logoUrl = logoPath
    ? `${serviceConfig.websiteUrl}${logoPath}`
    : null

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Testimonial Request</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header with service-specific branding -->
        <div style="background-color: ${headerColor}; color: white; padding: 30px 20px; text-align: center;">
            ${logoUrl ? `
            <div style="margin-bottom: 20px;">
                <img src="${logoUrl}" alt="${serviceConfig.name}" style="max-width: 200px; height: auto; display: inline-block;" />
            </div>
            ` : ''}
            <h1 style="margin: 0; font-size: 28px;">We'd Love Your Feedback!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Your experience matters to us</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 20px;">
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Hi ${clientName},
            </p>

            ${customMessage ? `
            <div style="padding: 20px; background-color: #f8fafc; border-left: 4px solid ${buttonColor}; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.6;">${customMessage}</p>
            </div>
            ` : `
            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Thank you for choosing ${serviceName}! We hope you're pleased with the service we provided.
            </p>
            `}

            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                We'd greatly appreciate it if you could take a moment to share your experience. Your feedback helps us continue to provide exceptional service to our valued clients.
            </p>

            <!-- CTA Button with service-specific color -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${formLink}"
                   style="display: inline-block; padding: 16px 40px; background-color: ${buttonColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
                    Share Your Feedback
                </a>
            </div>

            <p style="margin: 20px 0 0 0; color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
                Or copy and paste this link into your browser:<br>
                <a href="${formLink}" style="color: ${buttonColor}; word-break: break-all;">${formLink}</a>
            </p>
        </div>

        <!-- Footer with unified Evangelo Sommer branding -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">
                Thank you for your business!
            </p>
            <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                <strong style="color: ${accentColor};">Evangelo Sommer</strong><br>
                ${serviceConfig.feedbackEmail}
            </p>
        </div>
    </div>
</body>
</html>
  `.trim()
}
