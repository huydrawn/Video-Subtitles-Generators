// src/Components/PaymentSuccessPage/index.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Spin, Result, Button, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../Store';
import { fetchUserData } from '../../Store/useSlice'; // To get username and new plan

const { Content } = Layout;
const { Paragraph, Text, Title: AntTitle } = Typography;

// Minimal plan data for displaying price.
// Ensure this is consistent with plans defined in NewHomePage or a shared source.
const minimalPlanData = [
    { key: "FREE", title: "Free", priceInCents: 0 },
    { key: "BASIC", title: "Basic", priceInCents: 200 },
    { key: "PRO", title: "Pro", priceInCents: 500 },
    { key: "PREMIUM", title: "Premium", priceInCents: 1000 },
];

const formatPrice = (priceInCents: number | undefined): string => {
    if (typeof priceInCents === 'undefined') return "N/A";
    if (priceInCents === 0) return "Free"; // Or a different string if free plans aren't "paid"
    return `$${(priceInCents / 100.0).toFixed(2)}`;
};

const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const location = useLocation();

    const {
        userData: currentUserData,
        isLoading: isUserLoading,
        error: userFetchError
    } = useSelector((state: RootState) => state.user);

    // Capture the time when the component mounts as the "payment confirmation time" for display
    const [paymentTime] = useState(new Date());
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        // Attempt to fetch the latest user data to reflect the new plan and get username
        dispatch(fetchUserData());

        // Extract session_id from URL for reference, if present
        const queryParams = new URLSearchParams(location.search);
        const sId = queryParams.get('session_id');
        if (sId) {
            setSessionId(sId);
        }
    }, [dispatch, location.search]);

    // Show loading spinner while fetching user data
    if (isUserLoading && !currentUserData && !userFetchError) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Loading confirmation details..." />
            </Layout>
        );
    }

    // Prepare details for display
    const username = currentUserData?.username || 'Valued User';
    const currentPlanKey = currentUserData?.status; // This should be the new plan after successful payment & webhook
    const currentPlanInfo = currentPlanKey ? minimalPlanData.find(p => p.key === currentPlanKey) : null;

    const planName = currentPlanInfo?.title || currentPlanKey || 'Your New Plan';
    // The "amount paid" is assumed to be the price of the new plan.
    const amountBilled = formatPrice(currentPlanInfo?.priceInCents);

    // Handle case where user data fetch failed
    if (userFetchError && !currentUserData) {
        return (
            <Layout>
                <Content style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
                    <Result
                        status="warning" // Payment likely succeeded, but we can't confirm details
                        title={<AntTitle level={2}>Payment Processed</AntTitle>}
                        subTitle="Your payment was processed. We're having trouble loading your updated account details at the moment. Please check your dashboard later."
                        extra={[
                            <Button type="primary" size="large" key="dashboard" onClick={() => navigate('/index')}>
                                Go to Dashboard
                            </Button>,
                        ]}
                    >
                        <div style={{
                            textAlign: 'left',
                            display: 'inline-block',
                            marginTop: '24px',
                            padding: '24px',
                            border: '1px solid #e8e8e8',
                            borderRadius: '8px',
                            backgroundColor: '#fafafa'
                        }}>
                            <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                                <Text strong>Confirmation Time:</Text> {paymentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </Paragraph>
                            {sessionId && (
                                <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: '16px', wordBreak: 'break-all' }}>
                                    <Text strong>Payment Session ID (for reference):</Text> {sessionId}
                                </Paragraph>
                            )}
                        </div>
                    </Result>
                </Content>
            </Layout>
        );
    }

    // Default success display
    return (
        <Layout>
            <Content style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
                <Result
                    status="success"
                    icon={<CheckCircleOutlined style={{ fontSize: '72px', color: '#52c41a' }} />}
                    title={<AntTitle level={2}>Payment Successful!</AntTitle>}
                    subTitle={`Thank you, ${username}! Your upgrade to the ${planName} plan is complete.`}
                    extra={[
                        <Button type="primary" size="large" key="dashboard" onClick={() => navigate('/index')}>
                            Go to Dashboard
                        </Button>,
                    ]}
                >
                    <div style={{
                        textAlign: 'left',
                        display: 'inline-block',
                        marginTop: '24px',
                        padding: '24px',
                        border: '1px solid #e8e8e8',
                        borderRadius: '8px',
                        backgroundColor: '#fafafa', // Light background for the details box
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)'
                    }}>
                        <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                            <Text strong>User:</Text> {username}
                        </Paragraph>
                        <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                            <Text strong>New Plan:</Text> {planName}
                        </Paragraph>
                        <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                            <Text strong>Amount Billed:</Text> <Text style={{ fontWeight: 'bold', color: '#1890ff' }}>{amountBilled}</Text>
                        </Paragraph>
                        <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                            <Text strong>Confirmation Time:</Text> {paymentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Paragraph>
                        {sessionId && (
                            <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: '16px', wordBreak: 'break-all' }}>
                                <Text strong>Payment Session ID (for reference):</Text> {sessionId}
                            </Paragraph>
                        )}
                    </div>
                </Result>
            </Content>
        </Layout>
    );
};

export default PaymentSuccessPage;