import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { toast } from 'sonner';
import {
  Send, CheckCircle, X, DollarSign, Clock, Shield, FileText,
  ChevronLeft, AlertCircle, CreditCard, Download, RefreshCw,
  Lock, Unlock, AlertTriangle, PenTool
} from 'lucide-react';

const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

const statusColors = {
  negotiating: 'bg-amber-100 text-amber-800 border-amber-200',
  pending_approval: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-violet-100 text-violet-800 border-violet-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels = {
  negotiating: 'In Negotiation',
  pending_approval: 'Pending Approval',
  approved: 'Deal Approved',
  paid: 'Payment Complete',
  completed: 'Completed',
  rejected: 'Rejected',
};

const MessageBubble = ({ msg, isMe }) => {
  const typeColors = {
    offer: 'border-l-blue-500',
    counter_offer: 'border-l-amber-500',
    acceptance: 'border-l-emerald-500',
    system: 'border-l-slate-400',
    text: '',
  };

  if (msg.message_type === 'system') {
    return (
      <div className="flex justify-center my-3 message-bubble" data-testid={`msg-${msg.id}`}>
        <div className="bg-slate-100 text-slate-600 text-xs px-4 py-1.5 rounded-full border border-slate-200">
          {msg.message}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 message-bubble`} data-testid={`msg-${msg.id}`}>
      <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs text-slate-500">{msg.sender_name}</span>
          <span className="text-xs text-slate-400 capitalize">({msg.sender_role?.replace('_', ' ')})</span>
          {msg.is_accepted && <CheckCircle className="w-3 h-3 text-emerald-500" />}
        </div>
        <div className={`rounded-lg px-4 py-3 border-l-4 ${typeColors[msg.message_type] || ''} ${
          isMe
            ? 'bg-slate-900 text-white border-l-4 border-l-blue-400'
            : 'bg-white border border-slate-200'
        }`}>
          {(msg.message_type === 'offer' || msg.message_type === 'counter_offer' || msg.message_type === 'acceptance') && msg.amount && (
            <div className={`flex items-center gap-2 mb-1 ${msg.message_type === 'acceptance' ? 'text-emerald-400' : isMe ? 'text-blue-300' : 'text-blue-600'}`}>
              <DollarSign className="w-3.5 h-3.5" />
              <span className="font-bold text-lg font-mono">{fmt(msg.amount)}<span className="text-xs font-normal">/mo</span></span>
            </div>
          )}
          <p className={`text-sm ${isMe ? 'text-slate-200' : 'text-slate-700'}`}>{msg.message}</p>
          <p className={`text-xs mt-1.5 ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`text-xs mt-1 px-1.5 py-0.5 rounded font-medium ${
          msg.message_type === 'offer' ? 'bg-blue-100 text-blue-700' :
          msg.message_type === 'counter_offer' ? 'bg-amber-100 text-amber-700' :
          msg.message_type === 'acceptance' ? 'bg-emerald-100 text-emerald-700' :
          'hidden'
        }`}>
          {msg.message_type === 'offer' ? 'OFFER' : msg.message_type === 'counter_offer' ? 'COUNTER' : msg.message_type === 'acceptance' ? 'ACCEPTED' : ''}
        </span>
      </div>
    </div>
  );
};

const Negotiation = () => {
  const { id: dealId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msgType, setMsgType] = useState('text');
  const [msgText, setMsgText] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [contract, setContract] = useState(null);
  const [dispute, setDispute] = useState(null);
  const [disputeForm, setDisputeForm] = useState({ reason: '', description: '' });
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const loadDeal = async () => {
    try {
      const [dealRes, msgsRes] = await Promise.all([
        api.get(`/deals/${dealId}`),
        api.get(`/deals/${dealId}/messages`)
      ]);
      setDeal(dealRes.data);
      setMessages(msgsRes.data);
    } catch (err) {
      toast.error('Deal not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeal();
    pollRef.current = setInterval(loadDeal, 4000);
    return () => clearInterval(pollRef.current);
  }, [dealId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!msgText.trim() && msgType === 'text') return;
    if ((msgType === 'offer' || msgType === 'counter_offer') && !offerAmount) {
      toast.error('Enter an offer amount');
      return;
    }
    setSending(true);
    try {
      await api.post(`/deals/${dealId}/messages`, {
        message_type: msgType,
        amount: (msgType !== 'text') ? parseFloat(offerAmount) : null,
        message: msgText || (msgType !== 'text' ? `${msgType === 'counter_offer' ? 'Counter offer' : 'Offer'}: ${fmt(offerAmount)}/month` : '')
      });
      setMsgText('');
      setOfferAmount('');
      await loadDeal();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const acceptOffer = async () => {
    try {
      await api.post(`/deals/${dealId}/accept-offer`);
      toast.success('Offer accepted! Awaiting approvals.');
      await loadDeal();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept offer');
    }
  };

  const approveDeal = async () => {
    try {
      const res = await api.post(`/deals/${dealId}/approve`);
      if (res.data.fully_approved) {
        toast.success('Deal fully approved! Ready for payment.');
      } else {
        toast.success('Your approval recorded. Waiting for other party.');
      }
      await loadDeal();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve');
    }
  };

  const rejectDeal = async () => {
    if (!window.confirm('Reject this deal and re-open negotiation?')) return;
    try {
      await api.post(`/deals/${dealId}/reject`);
      toast.info('Deal rejected. Negotiation re-opened.');
      await loadDeal();
    } catch (err) {
      toast.error('Failed to reject deal');
    }
  };

  const processPayment = async () => {
    if (!window.confirm(`Confirm payment of ${fmt(deal.final_price)}/month for this deal?`)) return;
    try {
      const res = await api.post(`/deals/${dealId}/pay`);
      toast.success(`Payment processed! Invoice: ${res.data.invoice_number}`);
      await loadDeal();
      // Load invoice
      const invRes = await api.get(`/deals/${dealId}/invoice`);
      setInvoice(invRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Payment failed');
    }
  };

  const loadInvoice = async () => {
    try {
      const res = await api.get(`/deals/${dealId}/invoice`);
      setInvoice(res.data);
    } catch (err) {
      toast.error('Invoice not available yet');
    }
  };

  const loadContract = async () => {
    try {
      const res = await api.get(`/deals/${dealId}/contract`);
      setContract(res.data);
    } catch (err) {
      toast.error('Contract not available yet');
    }
  };

  const signContract = async () => {
    try {
      await api.post(`/deals/${dealId}/sign`);
      toast.success('Contract signed');
      await loadContract();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to sign');
    }
  };

  const raiseDispute = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/deals/${dealId}/dispute`, disputeForm);
      toast.success('Dispute raised. Escrow hold activated.');
      setDispute(res.data);
      setShowDisputeForm(false);
      await loadDeal();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to raise dispute');
    }
  };

  const loadDispute = async () => {
    try {
      const res = await api.get(`/deals/${dealId}/dispute`);
      setDispute(res.data);
    } catch (err) {
      // No dispute exists
    }
  };

  const lockThread = async () => {
    try {
      await api.post(`/deals/${dealId}/lock`, { reason: 'Thread locked by manager' });
      toast.success('Thread locked');
      await loadDeal();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to lock');
    }
  };

  const unlockThread = async () => {
    try {
      await api.post(`/deals/${dealId}/unlock`);
      toast.success('Thread unlocked');
      await loadDeal();
    } catch (err) {
      toast.error('Failed to unlock');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50"><Navbar />
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );

  if (!deal) return null;

  // Determine party relationships
  const isSellerParty = deal.seller_company_id === user?.company_id;
  const isBuyerParty = deal.buyer_company_id === user?.company_id || deal.rep_id === user?.id;
  const isRep = user?.role === 'rep';
  const isManager = ['owner', 'brand_manager'].includes(user?.role);
  
  // Permission checks
  // Reps CAN negotiate but CANNOT approve/pay
  // Managers CAN do everything: negotiate, approve, pay
  const canApprove = deal.status === 'pending_approval' && isManager && (
    (isSellerParty && !deal.seller_approved) ||
    (isBuyerParty && !deal.buyer_approved)
  );
  const canPay = deal.status === 'approved' && isBuyerParty && isManager;
  const canNegotiate = deal.status === 'negotiating' && (isSellerParty || isBuyerParty);
  const canLockThread = isManager && (isSellerParty || isBuyerParty);
  const canRaiseDispute = ['paid', 'active'].includes(deal.status) && (isSellerParty || isBuyerParty) && !deal.has_dispute;
  const showContract = ['pending_approval', 'approved', 'paid', 'active', 'completed'].includes(deal.status);

  return (
    <div className="min-h-screen bg-slate-50" data-testid="negotiation-page">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors duration-150">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>
              {deal.billboard_title}
            </h1>
            <p className="text-sm text-slate-500">{deal.billboard_address}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${statusColors[deal.status] || 'bg-slate-100 text-slate-600'}`} data-testid="deal-status-badge">
            {statusLabels[deal.status] || deal.status}
          </span>
          {deal.thread_locked && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1" data-testid="thread-locked-badge">
              <Lock className="w-3 h-3" /> Locked
            </span>
          )}
          <button onClick={loadDeal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors duration-150">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chat */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg flex flex-col" style={{ height: '600px' }}>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                <span className="text-sm font-medium text-slate-700">Negotiation Thread</span>
                <span className="text-xs text-slate-400">— Immutable audit log</span>
              </div>
              <span className="text-xs text-slate-500">{messages.length} messages</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isMe={msg.sender_id === user?.id} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {canNegotiate && (
              <div className="border-t border-slate-100 p-4">
                {/* Message Type Selector */}
                <div className="flex gap-1.5 mb-3">
                  {[
                    { val: 'text', label: 'Message', show: true },
                    { val: 'offer', label: 'Make Offer', show: isBuyerParty },
                    { val: 'counter_offer', label: 'Counter Offer', show: isSellerParty },
                  ].filter(t => t.show).map(t => (
                    <button
                      key={t.val}
                      onClick={() => setMsgType(t.val)}
                      data-testid={`msg-type-${t.val}`}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors duration-150 ${
                        msgType === t.val ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Rep price band notice */}
                {isRep && (msgType === 'offer' || msgType === 'counter_offer') && (
                  <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                    <strong>Note:</strong> As a rep, your offers must stay within the price band set by your manager.
                  </div>
                )}

                {(msgType === 'offer' || msgType === 'counter_offer') && (
                  <div className="mb-2">
                    <input
                      type="number" min="1" placeholder="Enter amount (₹/month)"
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                      data-testid="offer-amount-field"
                      className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={msgType === 'text' ? "Type a message..." : "Add a note (optional)"}
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    data-testid="message-input"
                    className="flex-1 h-9 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending}
                    data-testid="send-message-btn"
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md transition-colors duration-150 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>

                {canNegotiate && messages.length > 0 && (
                  <button
                    onClick={acceptOffer}
                    data-testid="accept-offer-btn"
                    className="w-full mt-3 h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept Current Offer ({fmt(deal.current_offer)}/mo)
                  </button>
                )}
              </div>
            )}

            {deal.status !== 'negotiating' && (
              <div className="border-t border-slate-100 p-3 text-center">
                <p className="text-xs text-slate-400">Negotiation closed — messages are read-only</p>
              </div>
            )}
          </div>

          {/* Deal Info Sidebar */}
          <div className="space-y-4">
            {/* Deal Summary */}
            <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="deal-summary-card">
              <h3 className="font-semibold text-slate-900 mb-4" style={{ fontFamily: "'Public Sans', sans-serif" }}>Deal Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Offer</span>
                  <span className="font-bold text-slate-900">{fmt(deal.current_offer)}/mo</span>
                </div>
                {deal.final_price && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Final Price</span>
                    <span className="font-bold text-emerald-700">{fmt(deal.final_price)}/mo</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Booking Period</span>
                  <span className="font-medium text-slate-900">{deal.booking_start_date} → {deal.booking_end_date}</span>
                </div>
                {deal.commission_breakdown && (
                  <>
                    <div className="border-t border-slate-100 pt-3 space-y-1.5">
                      <p className="text-xs font-semibold text-slate-700">Commission Breakdown</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Platform (6%)</span>
                        <span>{fmt(deal.commission_breakdown.platform_commission)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Rep (4%)</span>
                        <span className="text-emerald-700">{fmt(deal.commission_breakdown.rep_commission)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">Owner Receives (90%)</span>
                        <span>{fmt(deal.commission_breakdown.seller_amount)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Approval Status */}
            {deal.status === 'pending_approval' && (
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="approval-panel">
                <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: "'Public Sans', sans-serif" }}>Owner Approvals</h3>
                <div className="space-y-2 mb-4">
                  <div className={`flex items-center gap-2 text-sm ${deal.buyer_approved ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {deal.buyer_approved ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    <span>Buyer Company {deal.buyer_approved ? '✓ Approved' : '— Pending'}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-sm ${deal.seller_approved ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {deal.seller_approved ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    <span>Seller Company {deal.seller_approved ? '✓ Approved' : '— Pending'}</span>
                  </div>
                </div>
                {canApprove && (
                  <div className="space-y-2">
                    <button
                      onClick={approveDeal}
                      data-testid="approve-deal-btn"
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve Deal
                    </button>
                    <button
                      onClick={rejectDeal}
                      data-testid="reject-deal-btn"
                      className="w-full h-9 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Reject & Re-negotiate
                    </button>
                  </div>
                )}
                {!canApprove && isRep && (isSellerParty || isBuyerParty) && (
                  <p className="text-xs text-amber-600 text-center bg-amber-50 p-2 rounded">
                    Only managers can approve deals. Please notify your manager.
                  </p>
                )}
                {!canApprove && isManager && (
                  <p className="text-xs text-slate-500 text-center">Waiting for other party's approval</p>
                )}
              </div>
            )}

            {/* Payment */}
            {canPay && (
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="payment-panel">
                <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: "'Public Sans', sans-serif" }}>Complete Payment</h3>
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-slate-500 mb-1">Amount to pay</p>
                  <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Public Sans', sans-serif" }}>{fmt(deal.final_price)}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                  <p className="text-xs text-slate-500 mt-1">Funds held in escrow, released on deal start date</p>
                </div>
                <button
                  onClick={processPayment}
                  data-testid="pay-now-btn"
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay Now (Simulated)
                </button>
              </div>
            )}

            {/* Invoice */}
            {deal.status === 'paid' && (
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="invoice-panel">
                <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: "'Public Sans', sans-serif" }}>GST Invoice</h3>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-emerald-700 font-medium">Invoice generated</p>
                  <p className="font-mono text-sm font-bold text-emerald-900">{deal.invoice_number}</p>
                </div>
                {!invoice ? (
                  <button onClick={loadInvoice} className="w-full h-9 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" /> View Invoice
                  </button>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice No.</span>
                      <span className="font-mono font-semibold">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Buyer</span>
                      <span className="font-medium">{invoice.buyer?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Seller</span>
                      <span className="font-medium">{invoice.seller?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Buyer GST</span>
                      <span className="font-mono">{invoice.buyer?.gst_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Seller GST</span>
                      <span className="font-mono">{invoice.seller?.gst_number}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="text-slate-500">Total Amount</span>
                      <span className="font-bold text-slate-900">{fmt(invoice.deal?.final_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HSN Code</span>
                      <span className="font-mono">998361</span>
                    </div>
                    <p className="text-slate-400 text-center pt-1">GST Invoice per CGST Act Section 31</p>
                  </div>
                )}
              </div>
            )}

            {/* Contract (F1) */}
            {showContract && (
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="contract-panel">
                <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: "'Public Sans', sans-serif" }}>Deal Contract</h3>
                {!contract ? (
                  <button onClick={loadContract} data-testid="view-contract-btn"
                    className="w-full h-9 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2">
                    <PenTool className="w-4 h-4" /> View Contract
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Contract No.</span>
                        <span className="font-mono font-semibold">{contract.contract_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Buyer Org</span>
                        <span className="font-medium">{contract.buyer?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Seller Org</span>
                        <span className="font-medium">{contract.seller?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Board</span>
                        <span className="font-medium">{contract.billboard?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Agreed Price</span>
                        <span className="font-bold">{fmt(contract.deal?.final_price)}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Period</span>
                        <span>{contract.deal?.booking_start_date} → {contract.deal?.booking_end_date}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className={`flex items-center gap-2 text-xs ${deal.buyer_signed ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {deal.buyer_signed ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        Buyer: {deal.buyer_signed ? `Signed by ${deal.buyer_signed_by}` : 'Pending signature'}
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${deal.seller_signed ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {deal.seller_signed ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        Seller: {deal.seller_signed ? `Signed by ${deal.seller_signed_by}` : 'Pending signature'}
                      </div>
                    </div>
                    {user?.role !== 'rep' && (
                      (isSellerParty && !deal.seller_signed) || (isBuyerParty && !deal.buyer_signed)
                    ) && (
                      <button onClick={signContract} data-testid="sign-contract-btn"
                        className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md transition-colors duration-150 flex items-center justify-center gap-2">
                        <PenTool className="w-4 h-4" /> Sign Contract (OTP Simulated)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Thread Lock (F2) */}
            {canLockThread && deal.status === 'negotiating' && (
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="thread-lock-panel">
                <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: "'Public Sans', sans-serif" }}>Thread Control</h3>
                {deal.thread_locked ? (
                  <div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-1">
                        <Lock className="w-3.5 h-3.5" /> Thread Locked
                      </div>
                      <p className="text-xs text-amber-600">{deal.lock_reason}</p>
                      <p className="text-xs text-amber-500 mt-1">Locked by {deal.locked_by}</p>
                    </div>
                    <button onClick={unlockThread} data-testid="unlock-thread-btn"
                      className="w-full h-9 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2">
                      <Unlock className="w-4 h-4" /> Unlock Thread
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-500 mb-3">Lock this thread to prevent further negotiation. Both parties can only transact on-platform for 30 days.</p>
                    <button onClick={lockThread} data-testid="lock-thread-btn"
                      className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" /> Lock Thread
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Dispute (F5) */}
            {canRaiseDispute && (
              <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="dispute-panel">
                <h3 className="font-semibold text-slate-900 mb-3" style={{ fontFamily: "'Public Sans', sans-serif" }}>Dispute Resolution</h3>
                {!showDisputeForm ? (
                  <div>
                    <p className="text-xs text-slate-500 mb-3">Raise a dispute within 7 days of deal start. Escrow will be held pending review.</p>
                    <button onClick={() => setShowDisputeForm(true)} data-testid="raise-dispute-btn"
                      className="w-full h-9 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors duration-150 flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Raise Dispute
                    </button>
                  </div>
                ) : (
                  <form onSubmit={raiseDispute} className="space-y-3">
                    <input type="text" required placeholder="Reason (e.g., Board damaged)" value={disputeForm.reason}
                      onChange={e => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                      data-testid="dispute-reason-input"
                      className="w-full h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    <textarea required placeholder="Describe the issue in detail..." value={disputeForm.description}
                      onChange={e => setDisputeForm({ ...disputeForm, description: e.target.value })}
                      data-testid="dispute-description-input" rows={3}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none" />
                    <div className="flex gap-2">
                      <button type="submit" data-testid="submit-dispute-btn"
                        className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors duration-150">
                        Submit Dispute
                      </button>
                      <button type="button" onClick={() => setShowDisputeForm(false)}
                        className="px-3 h-9 border border-slate-200 text-slate-600 rounded-md text-sm hover:bg-slate-50 transition-colors duration-150">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
            {deal.has_dispute && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="dispute-active">
                <div className="flex items-center gap-2 text-red-700 text-xs font-semibold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Dispute Active
                </div>
                <p className="text-xs text-red-600">Escrow held. ClearDeal team reviewing within 72 hours.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Negotiation;
