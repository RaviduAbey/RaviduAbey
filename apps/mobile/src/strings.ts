export const strings = {
  appName: 'Lanka Ready',
  signIn: {
    title: 'Get ready for Sri Lanka',
    intro: 'Sign in with your email. We will send you a 6-digit code.',
    email: 'Email',
    send: 'Send code',
  },
  verify: {
    title: 'Check your email',
    intro: (email: string) => `We sent a 6-digit code to ${email}.`,
    code: '6-digit code',
    submit: 'Sign in',
    resend: 'Send a new code',
    resent: 'New code sent.',
    wrongCode: 'That code is wrong or has expired. Check the latest email or send a new code.',
  },
};
