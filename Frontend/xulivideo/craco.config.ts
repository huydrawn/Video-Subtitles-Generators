// craco.config.ts
import { Configuration as DevServerConfiguration } from 'webpack-dev-server';
// Bạn có thể cần import thêm kiểu từ webpack nếu sử dụng các tính năng sâu hơn
// import { Configuration as WebpackConfiguration } from 'webpack';

// Import kiểu cho tham số thứ hai từ craco nếu có và muốn type safety tốt hơn
// import { CracoDevServerContext } from '@craco/types'; // Cài đặt @craco/types nếu cần

export {}; // Giữ lại dòng này để tránh lỗi TS1208

module.exports = {
    devServer: (
        // Khai báo kiểu rõ ràng cho tham số devServerConfig
        devServerConfig: DevServerConfiguration,

        // Khai báo kiểu cho tham số thứ hai (context object)
        // Cách 1: Dùng 'any' nếu bạn không muốn tìm kiểu chính xác (không khuyến khích)
        // { env, paths, proxy, allowedHost }: any

        // Cách 2: (Tốt hơn) Import và sử dụng kiểu từ @craco/types nếu có
        // context: CracoDevServerContext

        // Cách 3: Khai báo kiểu nội tuyến nếu không muốn import
        { env, paths, proxy, allowedHost }: { env: string; paths: any; proxy: any; allowedHost: string } // Cung cấp kiểu cụ thể hơn nếu biết
    ): DevServerConfiguration => { // Khai báo kiểu trả về của hàm là DevServerConfiguration

        // Thêm headers cần thiết vào đây
        devServerConfig.headers = {
            ...devServerConfig.headers, // Giữ lại các headers hiện có nếu cần
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        };

        // Quan trọng: Trả về cấu hình đã sửa đổi
        return devServerConfig;
    },

    // Cấu hình webpack khác nếu có...
    // webpack: {
    //   configure: (webpackConfig: WebpackConfiguration, { env, paths }) => {
    //     webpackConfig.experiments = { ...webpackConfig.experiments, asyncWebAssembly: true };
    //     return webpackConfig;
    //   }
    // }
};