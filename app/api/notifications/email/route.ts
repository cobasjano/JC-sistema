import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody } = body;

    console.log('--- MOCK EMAIL SENT ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', emailBody);
    console.log('-----------------------');

    // In a real production environment, you would use something like Resend:
    // const { data, error } = await resend.emails.send({
    //   from: 'SaaS <onboarding@resend.dev>',
    //   to,
    //   subject,
    //   html: emailBody.replace(/\n/g, '<br>'),
    // });

    return NextResponse.json({ success: true, message: 'Email sent successfully (mocked)' });
  } catch (error) {
    console.error('Error in email notification API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
