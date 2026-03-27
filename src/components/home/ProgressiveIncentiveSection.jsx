import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrendingUp } from "lucide-react";

export default function ProgressiveIncentiveSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-10 mb-8">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="progressive-incentive" className="border-0">
            <AccordionTrigger className="hover:no-underline flex items-center gap-2 text-base font-semibold text-foreground">
              <TrendingUp className="w-5 h-5 text-primary" />
              プログレッシブ・インセンティブって何？
            </AccordionTrigger>
            <AccordionContent className="text-sm text-foreground space-y-4 pt-2">
              <div>
                <p className="font-bold text-base mb-2">📈 プログレッシブ・インセンティブとは</p>
                <p className="text-sm leading-relaxed mb-3">売り上げ毎に収益還元率が最大95%までUPするプログラムです。</p>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                  <p className="text-sm font-semibold text-blue-300">💡 BASICプランに加入で自動参加</p>
                  <p className="text-xs text-blue-200/80 mt-1">手続き不要。加入した月から自動的に適用されます。</p>
                </div>
              </div>
              <div>
                <p className="font-bold text-base mb-3">📊 月間売上の階層別 収益率</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <tbody className="divide-y divide-border/50">
                      <tr className="bg-primary/5">
                        <td className="px-3 py-2 font-semibold text-muted-foreground">100万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">86%</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold text-muted-foreground">300万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">87%</td>
                      </tr>
                      <tr className="bg-primary/5">
                        <td className="px-3 py-2 font-semibold text-muted-foreground">600万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">88%</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold text-muted-foreground">900万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">89%</td>
                      </tr>
                      <tr className="bg-primary/5">
                        <td className="px-3 py-2 font-semibold text-muted-foreground">1,200万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">90%</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold text-muted-foreground">1,500万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">91%</td>
                      </tr>
                      <tr className="bg-primary/5">
                        <td className="px-3 py-2 font-semibold text-muted-foreground">1,650万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">92%</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold text-muted-foreground">1,800万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">93%</td>
                      </tr>
                      <tr className="bg-primary/5">
                        <td className="px-3 py-2 font-semibold text-muted-foreground">1,950万円超</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">94%</td>
                      </tr>
                      <tr className="bg-primary/20">
                        <td className="px-3 py-2 font-bold text-primary">2,000万円以上</td>
                        <td className="px-3 py-2 text-right font-bold text-primary text-sm">95%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">※ 翌月に反映されます</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}