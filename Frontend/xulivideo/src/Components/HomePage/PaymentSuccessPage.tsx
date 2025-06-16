// src/Components/PaymentSuccessPage/index.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Spin, Result, Button, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../Store';
// Import updateAccountTierDirectly (thay vì updateAccountTier cũ)
import { fetchUserData, logoutUser, updateAccountTier } from '../../Store/useSlice';
import axios from 'axios';
import { AccountTierDTO, getDisplayPlans, formatPrice } from './utils';

const { Content } = Layout;
const { Paragraph, Text, Title: AntTitle } = Typography;

const PaymentSuccessPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const location = useLocation();

    const {
        userData: currentUserData,
        isLoading: isUserLoading,
        error: userFetchError
    } = useSelector((state: RootState) => state.user);

    const [accountTiers, setAccountTiers] = useState<AccountTierDTO[]>([]);
    const [isTiersLoading, setIsTiersLoading] = useState(true);
    const [tiersError, setTiersError] = useState<string | null>(null);

    const [paymentTime] = useState(new Date());
    const [sessionId, setSessionId] = useState<string | null>(null);
    // NEW: State để lưu gói mới từ URL
    const [newTierFromUrl, setNewTierFromUrl] = useState<string | null>(null);

    // Flag để đảm bảo API update chỉ được gọi một lần
    const [hasTierUpdated, setHasTierUpdated] = useState(false);

    useEffect(() => {
        // Lấy session ID và newTier từ URL
        const queryParams = new URLSearchParams(location.search);
        const sId = queryParams.get('session_id');
        const tierFromUrl = queryParams.get('newTier'); // Lấy newTier từ URL
        if (sId) {
            setSessionId(sId);
        }
        if (tierFromUrl) {
            setNewTierFromUrl(tierFromUrl);
        }

        // Luôn cố gắng fetch dữ liệu người dùng mới nhất khi trang tải để có dữ liệu ban đầu
        dispatch(fetchUserData());

        const fetchAccountTiers = async () => {
            setIsTiersLoading(true);
            setTiersError(null);
            const token = localStorage.getItem('accessToken');

            if (!token) {
                setTiersError("Không tìm thấy mã truy cập. Vui lòng đăng nhập lại.");
                setIsTiersLoading(false);
                return;
            }

            try {
                const response = await axios.get<AccountTierDTO[]>("http://localhost:8080/api/account-tiers", {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                setAccountTiers(response.data);
            } catch (err: any) {
                console.error("Failed to fetch account tiers:", err);
                let errorMsg = err.message || "Không thể tải chi tiết gói.";
                if (axios.isAxiosError(err) && err.response?.status === 401) {
                    errorMsg = "Phiên của bạn đã hết hạn hoặc không được ủy quyền. Vui lòng đăng nhập lại.";
                    dispatch(logoutUser());
                    navigate('/login');
                }
                setTiersError(errorMsg);
            } finally {
                setIsTiersLoading(false);
            }
        };

        fetchAccountTiers();

    }, [dispatch, location.search, navigate]);

    // NEW: useEffect để dispatch updateAccountTierDirectly và sau đó fetchUserData
    useEffect(() => {
        // Chỉ dispatch nếu có sessionId và newTierFromUrl, và chưa từng gọi cập nhật tier
        // Kiểm tra !isUserLoading và !userFetchError để đảm bảo dữ liệu user ban đầu đã có
        if (sessionId && newTierFromUrl && !isUserLoading && !userFetchError && !hasTierUpdated) {
            console.log(`Dispatching updateAccountTierDirectly for tier: ${newTierFromUrl}`);
            dispatch(updateAccountTier({ newTierName: newTierFromUrl }))
                .unwrap()
                .then(() => {
                    console.log("Account tier updated directly successfully. Re-fetching user data...");
                    setHasTierUpdated(true); // Đánh dấu đã gọi để tránh gọi lại
                    // RẤT QUAN TRỌNG: Gọi lại fetchUserData để cập nhật state.userData đầy đủ
                    // vì updateAccountTierDirectly chỉ trả về tên gói.
                    dispatch(fetchUserData());
                })
                .catch(error => {
                    console.error("Failed to update account tier directly:", error);
                    // Có thể hiển thị thông báo lỗi nhỏ nếu muốn
                });
        }
    }, [sessionId, newTierFromUrl, isUserLoading, userFetchError, dispatch, hasTierUpdated]);


    if ((isUserLoading && !currentUserData && !userFetchError) || isTiersLoading) {
        return (
            <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Đang tải chi tiết xác nhận..." />
            </Layout>
        );
    }

    const username = currentUserData?.username || 'Người dùng thân mến';
    const currentPlanKey = currentUserData?.status; // Đây sẽ là gói mới sau khi updateAccountTierDirectly và fetchUserData thành công

    const displayPlans = getDisplayPlans(accountTiers);
    const currentPlanInfo = currentPlanKey ? displayPlans.find(p => p.name === currentPlanKey) : null;

    const planName = currentPlanInfo?.title || currentPlanKey || 'Gói mới của bạn';
    const amountBilled = formatPrice(currentPlanInfo?.priceInCents);

    if ((userFetchError && !currentUserData) || tiersError) {
        return (
            <Layout>
                <Content style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
                    <Result
                        status="warning"
                        title={<AntTitle level={2}>Thanh toán đã được xử lý</AntTitle>}
                        subTitle={`Thanh toán của bạn đã được xử lý. Chúng tôi đang gặp sự cố khi tải chi tiết tài khoản hoặc thông tin gói của bạn. Vui lòng kiểm tra trang tổng quan sau.${tiersError ? ` Lỗi: ${tiersError}` : ''}`}
                        extra={[
                            <Button type="primary" size="large" key="dashboard" onClick={() => navigate('/index')}>
                                Đi tới Trang tổng quan
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
                                <Text strong>Thời gian xác nhận:</Text> {paymentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </Paragraph>
                            {sessionId && (
                                <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: '16px', wordBreak: 'break-all' }}>
                                    <Text strong>ID Phiên thanh toán (để tham khảo):</Text> {sessionId}
                                </Paragraph>
                            )}
                        </div>
                    </Result>
                </Content>
            </Layout>
        );
    }

    return (
        <Layout>
            <Content style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
                <Result
                    status="success"
                    icon={<CheckCircleOutlined style={{ fontSize: '72px', color: '#52c41a' }} />}
                    title={<AntTitle level={2}>Thanh toán thành công!</AntTitle>}
                    subTitle={`Cảm ơn bạn, ${username}! Nâng cấp của bạn lên gói ${planName} đã hoàn tất.`}
                    extra={[
                        <Button type="primary" size="large" key="dashboard" onClick={() => navigate('/index')}>
                            Đi tới Trang tổng quan
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
                        backgroundColor: '#fafafa',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)'
                    }}>
                        <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                            <Text strong>Người dùng:</Text> {username}
                        </Paragraph>
                        <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                            <Text strong>Gói mới:</Text> {planName}
                        </Paragraph>
                        <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                            <Text strong>Số tiền đã thanh toán:</Text> <Text style={{ fontWeight: 'bold', color: '#1890ff' }}>{amountBilled}</Text>
                        </Paragraph>
                        <Paragraph style={{ fontSize: '16px', marginBottom: '12px' }}>
                            <Text strong>Thời gian xác nhận:</Text> {paymentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Paragraph>
                        {sessionId && (
                            <Paragraph type="secondary" style={{ fontSize: '12px', marginTop: '16px', wordBreak: 'break-all' }}>
                                <Text strong>ID Phiên thanh toán (để tham khảo):</Text> {sessionId}
                            </Paragraph>
                        )}
                    </div>
                </Result>
            </Content>
        </Layout>
    );
};

export default PaymentSuccessPage;