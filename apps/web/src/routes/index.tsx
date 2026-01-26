import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Card, CardContent } from "@empat-challenge/web-ui";
import { authClient } from "@/lib/auth-client";
import {
  Briefcase,
  Building2,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session;

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Virtual Speech Therapy Platform
              <span className="block text-primary mt-2">For SLPs and Students</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Connect with your students through video sessions, interactive games, and track their progress all in one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <Link to="/caseload">
                <Button size="lg" className="text-lg">
                  Go to Caseload <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth/signup">
                  <Button size="lg" className="text-lg">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button size="lg" variant="outline" className="text-lg">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need for Virtual Therapy Sessions
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Video Sessions</h3>
                <p className="text-muted-foreground">
                  Conduct therapy sessions with your students through secure video calls with integrated WebRTC technology.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Interactive Games</h3>
                <p className="text-muted-foreground">
                  Engage students with Phaser-based interactive games synchronized in real-time for turn-based therapy activities.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Session Recording</h3>
                <p className="text-muted-foreground">
                  Track trial data, record behavioral notes, and monitor student progress throughout therapy sessions.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Progress Tracking</h3>
                <p className="text-muted-foreground">
                  Visualize student progress with charts and metrics to track improvement over time.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Caseload Management</h3>
                <p className="text-muted-foreground">
                  Manage all your students from a centralized caseload view with quick access to generate session links.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">AI Session Summaries</h3>
                <p className="text-muted-foreground">
                  Get AI-generated summaries of therapy sessions to track key achievements and areas for improvement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="text-center space-y-6 p-12">
            <h2 className="text-3xl font-bold">
              {isAuthenticated ? "Your Caseload Awaits" : "Ready to Start Therapy Sessions?"}
            </h2>
            <p className="text-lg text-muted-foreground">
              {isAuthenticated
                ? "Access your caseload and start generating session links for your students."
                : "Join now and start delivering virtual speech therapy sessions to your students."}
            </p>
            <Link to={isAuthenticated ? "/caseload" : "/auth/signup"}>
              <Button size="lg" className="text-lg">
                {isAuthenticated ? "Go to Caseload" : "Create Free Account"}{" "}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="text-center text-sm text-muted-foreground">
          <p>Empat Challenge - Virtual Speech Therapy Platform</p>
        </div>
      </footer>
    </div>
  );
}
