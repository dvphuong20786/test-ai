import { Component, type ErrorInfo, type ReactNode } from "react";

interface ThuocTinhChanLoiGiaoDien {
  children: ReactNode;
}

interface TrangThaiChanLoiGiaoDien {
  loi?: Error;
}

export class ChanLoiGiaoDien extends Component<ThuocTinhChanLoiGiaoDien, TrangThaiChanLoiGiaoDien> {
  state: TrangThaiChanLoiGiaoDien = {};

  static getDerivedStateFromError(loi: Error): TrangThaiChanLoiGiaoDien {
    return { loi };
  }

  componentDidCatch(loi: Error, thongTinLoi: ErrorInfo): void {
    // Giữ chi tiết trong DevTools để lập trình viên lần đúng component gây lỗi.
    console.error("VietDub gặp lỗi giao diện chưa được xử lý", loi, thongTinLoi.componentStack);
  }

  private taiLaiUngDung = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.loi) return this.props.children;
    return (
      <main className="man-hinh-loi-giao-dien">
        <section>
          <strong>Giao diện gặp lỗi ngoài dự kiến</strong>
          <p>Dự án và các đoạn đã tự động lưu vẫn được giữ nguyên. Hãy tải lại ứng dụng để tiếp tục.</p>
          <code>{this.state.loi.message}</code>
          <button className="nut-chinh" onClick={this.taiLaiUngDung}>Tải lại ứng dụng</button>
        </section>
      </main>
    );
  }
}
