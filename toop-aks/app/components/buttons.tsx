import { Text, View, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';

interface buttonActionProps {
    type: string;
    label: string;
    iconeName: string;
    onPress: () => void;
}

export default function ActionButton({ type, label, iconeName, onPress }: buttonActionProps) {

    const cardStyle = [
        type === 'photography' && styles.photographyCard,
        type === 'panel_making' && styles.planningCard,
        type === 'printing' && styles.printingCard
    ]

    return (
        <TouchableOpacity
            style={[
                styles.actionCard,
                cardStyle,
                styles.actionCardActive]}

            onPress={onPress}
        >
            <Ionicons name={iconeName} size={24} color="#fff" />
            <Text style={styles.actionCardText}>{label}</Text>
        </TouchableOpacity>

    );
}
interface ButtonProps {
    type: string;
    isActive: boolean;
    iconeName: string;
    onPress: () => void;
}
export const FilterByType = ({ type, isActive, iconeName, onPress }: ButtonProps) => {


    const buttonActive = isActive ? styles.filterButtonActive : null;
    const textColor = isActive ? styles.filterButtonTextActive : null;
    const color = isActive ? '#fff' : '#64748b';


    return (

        < TouchableOpacity
            style={[styles.filterButton, buttonActive]}
            onPress={onPress}
        >
            <Ionicons
                name={iconeName}
                size={18}
                color={color}

            />
            <Text style={[
                styles.filterButtonText,
                textColor
            ]}>
                {type}
            </Text>
        </TouchableOpacity >

    )
};

const styles = StyleSheet.create({
    actionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    actionCardActive: {
        transform: [{ scale: 0.98 }],
        shadowOpacity: 0.2,
    },
    photographyCard: {
        backgroundColor: '#7c3aed',
        shadowColor: '#7c3aed',
    },
    planningCard: {
        backgroundColor: '#0ea5e9',
        shadowColor: '#0ea5e9',
    },
    printingCard: {
        backgroundColor: '#10b981',
        shadowColor: '#10b981',
    },
    actionCardText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    filterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 8,
    },
    filterButtonActive: {
        backgroundColor: '#FF6B6B',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        textAlign: 'center',
    },
})
