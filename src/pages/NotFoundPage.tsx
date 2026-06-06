import { Link } from "react-router-dom";
import { PageTransition } from "../components/shared/PageTransition";
import { Button } from "../components/ui/Button";
import { ArrowLeft, Cpu } from "lucide-react";

export default function NotFoundPage() {
  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="rounded-full bg-slate-100 p-6 mb-6">
          <Cpu className="h-12 w-12 text-slate-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">404</h1>
        <p className="text-slate-500 mb-8 max-w-md">
          This page doesn't exist. It might have been moved or you may have followed an incorrect link.
        </p>
        <Link to="/">
          <Button>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </PageTransition>
  );
}