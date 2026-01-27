import { createFileRoute } from "@tanstack/react-router";
import { HelloWorldGame } from "@/components/game/hello-world-game";

export const Route = createFileRoute("/_authenticated/hello-world-game")({
  component: HelloWorldGamePage,
});

function HelloWorldGamePage() {
  return <HelloWorldGame />;
}
