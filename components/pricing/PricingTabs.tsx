'use client'

import { useState, useEffect } from 'react'
import { DollarSign, History } from 'lucide-react'
import PricingBulkTable from './PricingBulkTable'
import PriceHistoryTable from './PriceHistoryTable'
import { CheckCircle } from 'lucide-react'

type TabId = 'recommend' | 'history'

type Guardrails = {
  minPriceYen: number
  minMarginYen: number
  maxDiscountPct: number
  maxDiscountYen: number
}

type Props = {
  discountCandidates: any[]
  priceHistories: any[]
  guardrails: Guardrails
  /** Scroll to and emphasize this vehicle row on the recommend tab */
  highlightVehicleId?: string
  /** 在庫加重平均CVR（%）— 一覧はこの未満のみ */
  fleetAvgCvr: number
}

export default function PricingTabs({
  discountCandidates,
  priceHistories,
  guardrails,
  highlightVehicleId,
  fleetAvgCvr,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('recommend')

  useEffect(() => {
    if (highlightVehicleId) setActiveTab('recommend')
  }, [highlightVehicleId])

  const tabs: { id: TabId; label: string; icon: typeof DollarSign }[] = [
    { id: 'recommend', label: '価格見直し推奨', icon: DollarSign },
    { id: 'history', label: '変更履歴', icon: History },
  ]

  return (
    <div className="bg-white rounded-lg shadow">
      {/* 横軸タブ */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="p-6">
        {activeTab === 'recommend' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              対象は閲覧あり・平均未満・滞留60日以上（ダッシュボードと同じ）。並びはCVRギャップ優先。ルール／AIはギャップ・1%/2%ライン・滞留を反映します。
            </p>
            {discountCandidates.length > 0 ? (
              <PricingBulkTable
                rows={discountCandidates}
                guardrails={guardrails}
                highlightVehicleId={highlightVehicleId}
                fleetAvgCvr={fleetAvgCvr}
              />
            ) : (
              <div className="py-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">CVR が平均未満の車両はありません（閲覧あり・掲載在庫ベース）</p>
                <p className="text-sm text-gray-400 mt-2">閲覧数のない車両は CVR 比較の対象外です。</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              最近の価格変更履歴
            </p>
            {priceHistories.length > 0 ? (
              <PriceHistoryTable histories={priceHistories} />
            ) : (
              <div className="py-12 text-center">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">価格変更履歴はありません</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
