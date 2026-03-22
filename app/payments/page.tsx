'use client'

import { useState } from 'react'
import { MOCK_PAYMENT_LOGS } from '@/lib/data'
import { PaymentLog } from '@/lib/types'

export default function PaymentsPage() {
  const [payments] = useState<PaymentLog[]>(MOCK_PAYMENT_LOGS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'transaction' | 'client'>('transaction')

  const filteredPayments = payments.filter(payment => {
    if (filterBy === 'transaction') {
      return payment.id.toLowerCase().includes(searchTerm.toLowerCase())
    } else {
      return payment.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    }
  })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Historial de Pagos</h1>
        <p className="text-white/60">Registro de todas las transacciones realizadas</p>
      </div>

      <div className="mb-6 flex space-x-4">
        <div className="flex space-x-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="filterBy"
              value="transaction"
              checked={filterBy === 'transaction'}
              onChange={(e) => setFilterBy(e.target.value as 'transaction')}
              className="mr-2"
            />
            <span className="text-white/60 text-sm">ID de Transacción</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="filterBy"
              value="client"
              checked={filterBy === 'client'}
              onChange={(e) => setFilterBy(e.target.value as 'client')}
              className="mr-2"
            />
            <span className="text-white/60 text-sm">Nombre de Cliente</span>
          </label>
        </div>
        <input
          type="text"
          placeholder={`Buscar por ${filterBy === 'transaction' ? 'ID de transacción' : 'nombre de cliente'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-[#1a2332] border border-white/[0.08] rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-[#1a2332] rounded-lg border border-white/[0.08] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#111827] border-b border-white/[0.06]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">ID Transacción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Monto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Método de Pago</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-[#111827]">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">{payment.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{payment.clientName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">${payment.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{payment.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                  {payment.paymentMethod === 'cash' ? 'Efectivo' : payment.paymentMethod === 'transfer' ? 'Transferencia' : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{payment.adminName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-white/60">No se encontraron pagos que coincidan con la búsqueda</p>
        </div>
      )}
    </div>
  )
}