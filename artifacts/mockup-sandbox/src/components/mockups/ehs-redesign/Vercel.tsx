import React from "react";
import {
  Search,
  Bell,
  ChevronDown,
  ChevronsUpDown,
  Share,
  Download,
  Printer,
  Calendar,
  MapPin,
  Clock,
  MoreHorizontal,
  Users,
  Activity,
  MonitorPlay,
  CircleDollarSign,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Package,
  Zap,
  Coffee,
  Bed,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function Vercel() {
  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800">
      <style>{`
        .vercel-card {
          position: relative;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .vercel-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          z-index: 10;
        }
        .nav-link {
          color: #a1a1aa;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: #f4f4f5;
        }
        .nav-link.active {
          color: #f4f4f5;
        }
      `}</style>

      {/* App Chrome: Top Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="flex h-14 items-center px-4 md:px-6 max-w-7xl mx-auto">
          {/* Workspace & Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium text-zinc-100 px-2 py-1 hover:bg-zinc-800/50 rounded-md cursor-pointer transition-colors">
              <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-zinc-100 text-zinc-900">
                <Zap className="h-3 w-3" />
              </div>
              <span>EHS Prod</span>
              <ChevronsUpDown className="h-3 w-3 text-zinc-500" />
            </div>
            <span className="text-zinc-600">/</span>
            <div className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-800/50 rounded-md cursor-pointer transition-colors">
              <span className="text-zinc-300">Stavanger Konserthus</span>
            </div>
            <span className="text-zinc-600">/</span>
            <div className="flex items-center gap-2 px-2 py-1">
              <span className="font-semibold text-zinc-100 tracking-tight">Vårfest 2026</span>
            </div>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-500" />
              <input
                type="search"
                placeholder="Søk i prosjekt..."
                className="flex h-8 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
              <Bell className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8 border border-zinc-800 cursor-pointer">
              <AvatarImage src="" alt="Marius" />
              <AvatarFallback className="bg-zinc-800 text-xs text-zinc-300">MJ</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Primary Nav */}
        <div className="flex px-4 md:px-6 max-w-7xl mx-auto overflow-x-auto scrollbar-hide">
          <nav className="flex space-x-6 text-sm font-medium">
            <a href="#" className="nav-link active py-3 border-b-2 border-zinc-100">Oversikt</a>
            <a href="#" className="nav-link py-3 border-b-2 border-transparent">Rigg</a>
            <a href="#" className="nav-link py-3 border-b-2 border-transparent">Lys</a>
            <a href="#" className="nav-link py-3 border-b-2 border-transparent">LED</a>
            <a href="#" className="nav-link py-3 border-b-2 border-transparent">Lyd</a>
            <a href="#" className="nav-link py-3 border-b-2 border-transparent">Scene</a>
            <a href="#" className="nav-link py-3 border-b-2 border-transparent">Crew</a>
            <a href="#" className="nav-link py-3 border-b-2 border-transparent">Hotell</a>
            <a href="#" className="nav-link py-3 border-b-2 border-transparent">Catering</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
        
        {/* Project Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Stavanger Konserthus — Vårfest 2026</h1>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium rounded-full px-2.5">
                Aktiv
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                12.–14. mai 2026
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Zetlitz-salen, Stavanger
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" className="h-9 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300">
              <Download className="mr-2 h-4 w-4" />
              Eksporter Client Pack
            </Button>
            <Button className="h-9 bg-zinc-100 text-zinc-900 hover:bg-zinc-300 font-semibold shadow-sm">
              <Share className="mr-2 h-4 w-4" />
              Del brief
            </Button>
          </div>
        </div>

        {/* At-a-glance KPI strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="vercel-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-400">Crew booket</div>
              <Users className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold tracking-tight">18 <span className="text-zinc-500 text-lg font-medium">/ 22</span></div>
            </div>
            <Progress value={81} className="h-1.5 mt-3 bg-zinc-800 [&>div]:bg-zinc-300" />
          </div>

          <div className="vercel-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-400">Rigg-belastning</div>
              <Activity className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold tracking-tight">4.2 t <span className="text-zinc-500 text-lg font-medium">/ 6.0 t maks</span></div>
            </div>
            <Progress value={70} className="h-1.5 mt-3 bg-zinc-800 [&>div]:bg-amber-500" />
          </div>

          <div className="vercel-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-400">LED-paneler</div>
              <MonitorPlay className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold tracking-tight">96 <span className="text-zinc-500 text-sm font-medium">stk</span></div>
            </div>
            <div className="mt-3 text-xs text-zinc-500 font-medium">ROE Carbon CB5</div>
          </div>

          <div className="vercel-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-400">Estimert kostnad</div>
              <CircleDollarSign className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-2xl font-bold tracking-tight">kr 487 200</div>
            </div>
            <div className="mt-3 text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Innenfor budsjett
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main content column (spans 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Crew & Schedule Panel */}
            <div className="vercel-card">
              <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-100 tracking-tight">Crew & Tidsplan</h3>
                <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-zinc-400 hover:text-zinc-100">
                  Se full kalender <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <div className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-900/30 text-zinc-500 font-medium">
                      <tr>
                        <th className="px-5 py-3 border-b border-zinc-800">Navn & Rolle</th>
                        <th className="px-5 py-3 border-b border-zinc-800 w-28 text-center">Tir 12.05</th>
                        <th className="px-5 py-3 border-b border-zinc-800 w-28 text-center">Ons 13.05</th>
                        <th className="px-5 py-3 border-b border-zinc-800 w-28 text-center">Tor 14.05</th>
                        <th className="px-5 py-3 border-b border-zinc-800 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                      <tr className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-zinc-100">Marius J.</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Lystekniker</div>
                        </td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs">08-20</div></td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs">14-23</div></td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs">10-02</div></td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium">Bekreftet</Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-zinc-100">Sara H.</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Rigger</div>
                        </td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs">07-16</div></td>
                        <td className="px-5 py-3 text-center"><span className="text-zinc-600">—</span></td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs">22-04</div></td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium">Bekreftet</Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-zinc-100">Henrik T.</div>
                          <div className="text-xs text-zinc-500 mt-0.5">LED-tekniker</div>
                        </td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs border border-zinc-700">10-20</div></td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs border border-zinc-700">14-23</div></td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs border border-zinc-700">10-02</div></td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-medium">Venter svar</Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-zinc-100">Ingrid B.</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Lydtekniker</div>
                        </td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs">09-18</div></td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs">14-23</div></td>
                        <td className="px-5 py-3 text-center"><div className="mx-auto w-16 py-1 bg-zinc-800 rounded text-xs">10-02</div></td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium">Bekreftet</Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-zinc-900/50 transition-colors opacity-60">
                        <td className="px-5 py-3">
                          <div className="font-medium text-zinc-100 line-through">Andreas K.</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Stagehand</div>
                        </td>
                        <td className="px-5 py-3 text-center"><span className="text-zinc-600">—</span></td>
                        <td className="px-5 py-3 text-center"><span className="text-zinc-600">—</span></td>
                        <td className="px-5 py-3 text-center"><span className="text-zinc-600">—</span></td>
                        <td className="px-5 py-3 text-right">
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-medium">Avlyst</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Logistics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="vercel-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-zinc-400" />
                    <h3 className="font-semibold text-zinc-100 tracking-tight">Hotell</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500"><MoreHorizontal className="h-4 w-4" /></Button>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-zinc-300">Clarion Energy</div>
                  <div className="text-sm text-zinc-500">8 rom (enkeltrom)</div>
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-2 bg-zinc-900 inline-flex px-2 py-1 rounded-md border border-zinc-800">
                    <Clock className="h-3 w-3" /> Innsjekk: 12.05 kl 15:00
                  </div>
                </div>
              </div>

              <div className="vercel-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-5 w-5 text-zinc-400" />
                    <h3 className="font-semibold text-zinc-100 tracking-tight">Catering</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500"><MoreHorizontal className="h-4 w-4" /></Button>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium text-zinc-300">22 personer</div>
                  <div className="text-sm text-zinc-500">3 måltider per dag</div>
                  <div className="text-xs text-amber-400/90 flex items-center gap-1.5 mt-2 bg-amber-500/10 inline-flex px-2 py-1 rounded-md border border-amber-500/20 font-medium">
                    <HelpCircle className="h-3 w-3" /> 2 mangler diett-info
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right column (spans 1) */}
          <div className="space-y-6">
            
            {/* Technical Systems */}
            <div className="vercel-card">
              <div className="px-5 py-4 border-b border-zinc-800/50">
                <h3 className="font-semibold text-zinc-100 tracking-tight">Tekniske Systemer</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-zinc-200 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-zinc-400" /> Lys Hovedrigg
                    </div>
                    <span className="text-xs text-zinc-500">Marius J.</span>
                  </div>
                  <div className="text-xs text-zinc-400 flex items-center gap-3">
                    <span>12 punkter (CM Lodestar 1t)</span>
                    <span className="text-zinc-600">•</span>
                    <span>1.2 t</span>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-zinc-200 flex items-center gap-1.5">
                      <MonitorPlay className="h-3.5 w-3.5 text-zinc-400" /> LED Bakvegg
                    </div>
                    <span className="text-xs text-zinc-500">Henrik T.</span>
                  </div>
                  <div className="text-xs text-zinc-400 flex items-center gap-3">
                    <span>96 paneler (ROE Carbon)</span>
                    <span className="text-zinc-600">•</span>
                    <span>1.8 t</span>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-zinc-200 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-zinc-400" /> PA L/R Hang
                    </div>
                    <span className="text-xs text-zinc-500">Ingrid B.</span>
                  </div>
                  <div className="text-xs text-zinc-400 flex items-center gap-3">
                    <span>24 kasser (d&b KSL)</span>
                    <span className="text-zinc-600">•</span>
                    <span>1.2 t</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Feed */}
            <div className="vercel-card">
              <div className="px-5 py-4 border-b border-zinc-800/50">
                <h3 className="font-semibold text-zinc-100 tracking-tight">Siste aktivitet</h3>
              </div>
              <div className="p-5">
                <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                  
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-950 border border-emerald-500/50 text-emerald-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10 -translate-x-1/2">
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-6 md:ml-0 flex flex-col">
                      <div className="text-sm font-medium text-zinc-300">Marius J. bekreftet</div>
                      <div className="text-xs text-zinc-500">For 12.–14. mai</div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-950 border border-zinc-700 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10 -translate-x-1/2">
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-6 md:ml-0 flex flex-col text-right md:text-left">
                      <div className="text-sm font-medium text-zinc-300">Brief delt med 6 freelancere</div>
                      <div className="text-xs text-zinc-500">Via portal</div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-950 border border-zinc-700 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10 -translate-x-1/2">
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-6 md:ml-0 flex flex-col">
                      <div className="text-sm font-medium text-zinc-300">Sara H. lastet opp førerkort</div>
                      <div className="text-xs text-zinc-500">Godkjent klasse CE</div>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-950 border border-rose-500/50 text-rose-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10 -translate-x-1/2">
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-6 md:ml-0 flex flex-col text-right md:text-left">
                      <div className="text-sm font-medium text-zinc-300">Andreas K. avlyste</div>
                      <div className="text-xs text-zinc-500">Mangler stagehand ons-tor</div>
                    </div>
                  </div>
                  
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-zinc-950 border border-zinc-700 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10 -translate-x-1/2">
                    </div>
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-6 md:ml-0 flex flex-col">
                      <div className="text-sm font-medium text-zinc-300">Hotell booket</div>
                      <div className="text-xs text-zinc-500">8 rom på Clarion</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
