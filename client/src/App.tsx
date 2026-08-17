import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./i18n";
import BenchmarkDetail from "./pages/BenchmarkDetail";
import Benchmarks from "./pages/Benchmarks";
import Compare from "./pages/Compare";
import Decide from "./pages/Decide";
import Desktop from "./pages/Desktop";
import Home from "./pages/Home";
import Matrix from "./pages/Matrix";
import Mobile from "./pages/Mobile";
import Models from "./pages/Models";
import Radar from "./pages/Radar";
import Admin from "./pages/Admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/matrix" component={Matrix} />
      <Route path="/benchmarks" component={Benchmarks} />
      <Route path="/benchmarks/:slug" component={BenchmarkDetail} />
      <Route path="/models" component={Models} />
      <Route path="/compare" component={Compare} />
      <Route path="/decide" component={Decide} />
      <Route path="/radar" component={Radar} />
      <Route path="/admin" component={Admin} />
      {/* Purpose-built form factors, not responsive resizes of the workbench. */}
      <Route path="/m" component={Mobile} />
      <Route path="/m/:rest*" component={Mobile} />
      <Route path="/desktop" component={Desktop} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      {/* Dark is the default per requirement; the frost light variant stays
          available because this is a tool people read for long stretches.
          English is the default language, Chinese is one click away. */}
      <I18nProvider>
        <ThemeProvider defaultTheme="dark" switchable>
          <TooltipProvider delayDuration={200}>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
