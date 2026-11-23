import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    TouchableWithoutFeedback,
} from 'react-native';
import { Modal } from '@/components/dialogNative';
import Ionicons from '@react-native-vector-icons/ionicons';
import { PaymentCard } from '@/utils/rescueService';

interface CardModalProps {
    visible: boolean;
    onClose: () => void;
    cards: PaymentCard[];
    selectedCard: PaymentCard | null;
    onSelectCard: (card: PaymentCard) => void;
    onAddNewCard: (card: {
        card_holder_name: string;
        card_number_last4: string;
        card_brand: string;
        expiry_month: string;
        expiry_year: string;
    }) => Promise<boolean>;
}

export const CardManagementModal: React.FC<CardModalProps> = ({
    visible,
    onClose,
    cards,
    selectedCard,
    onSelectCard,
    onAddNewCard,
}) => {
    const [viewMode, setViewMode] = useState<'list' | 'add'>('list');
    const [cardHolder, setCardHolder] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 16);
        const matches = cleaned.match(/.{1,4}/g);
        return matches ? matches.join(' ') : cleaned;
    };

    const formatExpiry = (text: string) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 4);
        if (cleaned.length >= 3) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
        }
        return cleaned;
    };

    const detectBrand = (num: string): string => {
        const clean = num.replace(/\D/g, '');
        if (clean.startsWith('4')) return 'Visa';
        if (/^5[1-5]/.test(clean)) return 'Mastercard';
        if (/^3[47]/.test(clean)) return 'Amex';
        return 'Card';
    };

    const handleSaveNewCard = async () => {
        setErrorMsg('');
        const cleanNumber = cardNumber.replace(/\D/g, '');
        if (cleanNumber.length < 13) {
            setErrorMsg('Please enter a valid 16-digit card number');
            return;
        }
        if (!cardHolder.trim()) {
            setErrorMsg('Please enter cardholder name');
            return;
        }
        const cleanExpiry = expiry.replace(/\D/g, '');
        if (cleanExpiry.length < 4) {
            setErrorMsg('Please enter valid expiry date (MM/YY)');
            return;
        }

        const expMonth = cleanExpiry.slice(0, 2);
        const expYear = `20${cleanExpiry.slice(2, 4)}`;

        setLoading(true);
        const success = await onAddNewCard({
            card_holder_name: cardHolder.trim(),
            card_number_last4: cleanNumber.slice(-4),
            card_brand: detectBrand(cleanNumber),
            expiry_month: expMonth,
            expiry_year: expYear,
        });
        setLoading(false);

        if (success) {
            setCardHolder('');
            setCardNumber('');
            setExpiry('');
            setCvv('');
            setViewMode('list');
        } else {
            setErrorMsg('Failed to save card. Please try again.');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/50 justify-end">
                    <TouchableWithoutFeedback>
                        <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
                            {/* Header */}
                            <View className="flex-row items-center justify-between pb-4 ">
                                <Text className="text-lg font-poppin-bold text-gray-900">
                                    {viewMode === 'list' ? 'Select Payment Card' : 'Add New Card'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (viewMode === 'add') {
                                            setViewMode('list');
                                        } else {
                                            onClose();
                                        }
                                    }}
                                    className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                                >
                                    <Ionicons name="close" size={18} color="#6b7280" />
                                </TouchableOpacity>
                            </View>

                            {/* View Mode: LIST */}
                            {viewMode === 'list' ? (
                                <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
                                    {cards.length === 0 ? (
                                        <View className="py-8 items-center justify-center">
                                            <Ionicons name="card-outline" size={48} color="#9ca3af" />
                                            <Text className="text-sm font-poppin text-gray-500 mt-2 text-center">
                                                No saved cards yet. Add a card to pay securely.
                                            </Text>
                                        </View>
                                    ) : (
                                        <View className="gap-3">
                                            {cards.map((card) => {
                                                const isSelected = selectedCard?.id === card.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={card.id}
                                                        onPress={() => {
                                                            onSelectCard(card);
                                                            onClose();
                                                        }}
                                                        activeOpacity={0.7}
                                                        className={`p-4 rounded-2xl flex-row items-center justify-between ${isSelected ? 'bg-amber-50' : 'bg-gray-50'}`}
                                                    >
                                                        <View className="flex-row items-center gap-3">
                                                            <View className="w-10 h-10 rounded-xl bg-gray-900 items-center justify-center">
                                                                <Ionicons name="card" size={20} color="#ffffff" />
                                                            </View>
                                                            <View>
                                                                <Text className="text-sm font-poppin-semibold text-gray-900">
                                                                    {card.card_brand} •••• {card.card_number_last4}
                                                                </Text>
                                                                <Text className="text-xs font-poppin text-gray-500">
                                                                    {card.card_holder_name} (Expires {card.expiry_month}/{card.expiry_year.slice(-2)})
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        {isSelected && (
                                                            <Ionicons name="checkmark-circle" size={22} color="#f59e0b" />
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}

                                    {/* Button to Add New Card */}
                                    <TouchableOpacity
                                        onPress={() => setViewMode('add')}
                                        activeOpacity={0.8}
                                        className="mt-4 py-3.5 px-4 bg-gray-900 rounded-2xl flex-row items-center justify-center gap-2"
                                    >
                                        <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                                        <Text className="text-sm font-poppin-semibold text-white">
                                            Add New Debit / Credit Card
                                        </Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            ) : (
                                /* View Mode: ADD NEW CARD */
                                <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
                                    {errorMsg ? (
                                        <View className="p-3 bg-red-50 rounded-xl mb-4">
                                            <Text className="text-xs font-poppin text-red-600">{errorMsg}</Text>
                                        </View>
                                    ) : null}

                                    {/* Card Preview Banner */}
                                    <View className="bg-gradient-to-r bg-gray-900 p-5 rounded-2xl mb-5 shadow-sm">
                                        <View className="flex-row justify-between items-center mb-6">
                                            <Text className="text-xs font-poppin-semibold text-gray-400 uppercase tracking-wider">
                                                ResQ Pay
                                            </Text>
                                            <Text className="text-sm font-poppin-bold text-amber-400">
                                                {cardNumber ? detectBrand(cardNumber) : 'Debit / Credit'}
                                            </Text>
                                        </View>
                                        <Text className="text-lg font-poppin-semibold text-white tracking-widest mb-4">
                                            {cardNumber ? formatCardNumber(cardNumber) : '•••• •••• •••• ••••'}
                                        </Text>
                                        <View className="flex-row justify-between">
                                            <View>
                                                <Text className="text-[10px] font-poppin text-gray-400 uppercase">Cardholder</Text>
                                                <Text className="text-xs font-poppin-medium text-white">
                                                    {cardHolder || 'FULL NAME'}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text className="text-[10px] font-poppin text-gray-400 uppercase">Expires</Text>
                                                <Text className="text-xs font-poppin-medium text-white">
                                                    {expiry || 'MM/YY'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Inputs */}
                                    <View className="gap-3">
                                        <View>
                                            <Text className="text-xs font-poppin-medium text-gray-700 mb-1">Card Number</Text>
                                            <TextInput
                                                className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-poppin text-gray-900"
                                                placeholder="1234 5678 9012 3456"
                                                placeholderTextColor="#9ca3af"
                                                keyboardType="numeric"
                                                value={cardNumber}
                                                onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                                                maxLength={19}
                                            />
                                        </View>

                                        <View>
                                            <Text className="text-xs font-poppin-medium text-gray-700 mb-1">Cardholder Name</Text>
                                            <TextInput
                                                className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-poppin text-gray-900 uppercase"
                                                placeholder="N NETHONONDA"
                                                placeholderTextColor="#9ca3af"
                                                value={cardHolder}
                                                onChangeText={setCardHolder}
                                                autoCapitalize="characters"
                                            />
                                        </View>

                                        <View className="flex-row gap-3">
                                            <View className="flex-1">
                                                <Text className="text-xs font-poppin-medium text-gray-700 mb-1">Expiry Date</Text>
                                                <TextInput
                                                    className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-poppin text-gray-900"
                                                    placeholder="MM/YY"
                                                    placeholderTextColor="#9ca3af"
                                                    keyboardType="numeric"
                                                    value={expiry}
                                                    onChangeText={(t) => setExpiry(formatExpiry(t))}
                                                    maxLength={5}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-xs font-poppin-medium text-gray-700 mb-1">CVV / CVC</Text>
                                                <TextInput
                                                    className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-poppin text-gray-900"
                                                    placeholder="123"
                                                    placeholderTextColor="#9ca3af"
                                                    keyboardType="numeric"
                                                    secureTextEntry
                                                    value={cvv}
                                                    onChangeText={(t) => setCvv(t.slice(0, 4))}
                                                    maxLength={4}
                                                />
                                            </View>
                                        </View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View className="flex-row gap-3 mt-6">
                                        <TouchableOpacity
                                            onPress={() => setViewMode('list')}
                                            disabled={loading}
                                            className="flex-1 py-3.5 bg-gray-100 rounded-2xl items-center justify-center"
                                        >
                                            <Text className="text-sm font-poppin-semibold text-gray-700">Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleSaveNewCard}
                                            disabled={loading}
                                            className="flex-1 py-3.5 bg-emerald-500 rounded-2xl items-center justify-center"
                                        >
                                            {loading ? (
                                                <ActivityIndicator color="#ffffff" size="small" />
                                            ) : (
                                                <Text className="text-sm font-poppin-bold text-white">Save Card</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};
