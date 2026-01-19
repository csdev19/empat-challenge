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
              Track Your Job Applications
              <span className="block text-primary mt-2">All in One Place</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stay organized during your job search. Manage applications, track company details, and
              record every interaction in your hiring journey.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {isAuthenticated ? (
              <Link to="/hiring-processes">
                <Button size="lg" className="text-lg">
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
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
            Everything You Need to Manage Your Job Search
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Application Tracking</h3>
                <p className="text-muted-foreground">
                  Keep track of all your job applications with detailed status updates: ongoing,
                  rejected, dropped-out, or hired.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Company Details</h3>
                <p className="text-muted-foreground">
                  Store comprehensive company information including salary, benefits, location,
                  website, and contact details.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Interaction History</h3>
                <p className="text-muted-foreground">
                  Record every communication with companies during your hiring process to stay on
                  top of your conversations.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Pipeline Management</h3>
                <p className="text-muted-foreground">
                  Visualize your entire hiring pipeline and track progress through multiple
                  interview stages.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Status Updates</h3>
                <p className="text-muted-foreground">
                  Quickly update application statuses and see at a glance where each opportunity
                  stands.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6 */}
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Centralized Dashboard</h3>
                <p className="text-muted-foreground">
                  Access all your job applications from a clean, organized dashboard with powerful
                  search and filtering.
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
              {isAuthenticated ? "Your Dashboard Awaits" : "Ready to Organize Your Job Search?"}
            </h2>
            <p className="text-lg text-muted-foreground">
              {isAuthenticated
                ? "Access your applications and continue tracking your hiring journey."
                : "Join now and take control of your hiring journey. Start tracking your applications today."}
            </p>
            <Link to={isAuthenticated ? "/hiring-processes" : "/auth/signup"}>
              <Button size="lg" className="text-lg">
                {isAuthenticated ? "Go to Dashboard" : "Create Free Account"}{" "}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="text-center text-sm text-muted-foreground">
          <p>Hiring Tool - Manage your job applications with ease</p>
        </div>
      </footer>
    </div>
  );
}
