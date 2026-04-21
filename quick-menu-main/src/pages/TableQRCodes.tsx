import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { ArrowLeft, QrCode, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TOTAL_TABLES = 6;

export default function TableQRCodes() {
  const baseUrl = window.location.origin;

  const handleDownload = (tableNumber: number) => {
    const svg = document.getElementById(`qr-table-${tableNumber}`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = 400;
        canvas.height = 400;
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngFile = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = `table-${tableNumber}-qr.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
        }
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <QrCode className="h-6 w-6 text-primary" />
                <h1 className="font-bold text-xl text-foreground">Table QR Codes</h1>
              </div>
            </div>
            <div className="px-4 py-2 bg-primary/10 rounded-full">
              <span className="text-sm font-bold text-primary">{TOTAL_TABLES} Tables</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <p className="text-muted-foreground mb-6 text-center">
          Print these QR codes and place them on each table. Customers scan to order.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1).map((tableNumber) => (
            <Card key={tableNumber} className="text-center">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {tableNumber}
                  </span>
                  Table {tableNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-xl inline-block mx-auto shadow-inner">
                  <QRCodeSVG
                    id={`qr-table-${tableNumber}`}
                    value={`${baseUrl}/?table=${tableNumber}`}
                    size={180}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <p className="text-xs text-muted-foreground break-all">
                  {baseUrl}/?table={tableNumber}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownload(tableNumber)}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
