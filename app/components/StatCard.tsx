import { Card, Text, BlockStack, InlineStack } from '@shopify/polaris';
import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: string; // 'blue', 'green', 'purple', 'orange'
}

export function StatCard({ title, value, icon, color = 'blue' }: StatCardProps) {
    const getColors = (c: string) => {
        switch (c) {
            case 'blue': return { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' };
            case 'green': return { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' };
            case 'purple': return { bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8' };
            case 'orange': return { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' };
            default: return { bg: '#ffffff', border: '#e5e7eb', text: '#000000' };
        }
    };

    const style = getColors(color);

    return (
        <div style={{
            backgroundColor: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: '8px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '200px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text as="h3" variant="headingSm" tone="subdued">{title}</Text>
                {icon && <span style={{ fontSize: '24px' }}>{icon}</span>}
            </div>
            <Text as="p" variant="headingxl" fontWeight="bold" tone="success">
                <span style={{ color: style.text, fontSize: '28px', fontWeight: 'bold' }}>
                    {value}
                </span>
            </Text>
        </div>
    );
}
