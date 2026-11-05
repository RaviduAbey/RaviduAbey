import { SignInForm } from './SignInForm';

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="signin">
      <SignInForm key={error ?? "none"} notStaff={error === "not_staff"} />
    </main>
  );
}
