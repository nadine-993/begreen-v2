import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { catchError, map, of, switchMap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PdfService {
    private settingsService = inject(SettingsService);

    downloadPettyCashPdf(request: any) {
        const userIds = Array.from(new Set(request.history.map((h: any) => h.userId).filter((id: string) => !!id)));

        return this.settingsService.getSignatures(userIds as string[]).pipe(
            catchError(err => {
                console.error('Error fetching signatures', err);
                return of([]);
            }),
            map(signatures => {
                this.generatePettyCashPdf(request, signatures);
                return true;
            })
        );
    }

    private generatePettyCashPdf(request: any, signatureData: any[]) {
        const doc = new jsPDF();
        const margin = 20;
        let y = 30;

        doc.setFontSize(22);
        doc.setTextColor(0, 109, 78);
        doc.text('Petty Cash Voucher', margin, y);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        y += 10;
        doc.text(`Voucher ID: ${request.id}`, margin, y);
        doc.text(`Date: ${new Date(request.createdAt).toLocaleDateString()}`, doc.internal.pageSize.width - margin - 40, y);

        y += 15;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, doc.internal.pageSize.width - margin, y);

        y += 15;
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('Requestor Information', margin, y);

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${request.userName}`, margin, y);
        doc.text(`Department: ${request.department}`, margin + 80, y);

        y += 7;
        doc.text(`Division: ${request.division}`, margin, y);
        doc.text(`Status: ${request.status}`, margin + 80, y);

        y += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Disbursement Items', margin, y);

        const tableData = request.details.map((item: any) => [
            item.itemId,
            item.glCode,
            item.requestor,
            item.description,
            `${item.amount?.toLocaleString()} ${item.currency}`
        ]);

        autoTable(doc, {
            startY: y + 5,
            head: [['#', 'GL Code', 'Requestor', 'Description', 'Amount']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 109, 78], textColor: 255 },
            margin: { left: margin, right: margin }
        });

        y = (doc as any).lastAutoTable.finalY + 15;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const totalText = `Total: ${request.total?.toLocaleString()} ${request.currency}`;
        const textWidth = doc.getTextWidth(totalText);
        doc.text(totalText, doc.internal.pageSize.width - margin - textWidth, y);

        y += 30;
        doc.setFontSize(12);
        doc.text('Approvals & Signatures', margin, y);
        y += 10;

        let xSign = margin;
        const signWidth = 45;
        const signSpacing = 12;

        const uniqueSignatures: any[] = Array.from(new Map(request.history
            .filter((h: any) => h.userId)
            .map((h: any) => {
                const userData = signatureData.find(s => s.id === h.userId);
                return [userData?.name || h.userName, {
                    name: userData?.name || h.userName,
                    role: userData?.role || 'Approver',
                    signature: userData?.signature,
                    action: h.action,
                    note: h.note
                }];
            })).values());

        uniqueSignatures.forEach((user: any) => {
            if (xSign + signWidth > doc.internal.pageSize.width - margin) { xSign = margin; y += 65; }
            if (y + 50 > doc.internal.pageSize.height) { doc.addPage(); y = 30; }
            if (user.signature) { try { doc.addImage(user.signature, 'PNG', xSign, y, signWidth, 18); } catch (e) { } }
            doc.setDrawColor(200, 200, 200);
            doc.line(xSign, y + 20, xSign + signWidth, y + 20);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(user.name, xSign, y + 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(user.role || 'Approver', xSign, y + 31);
            doc.text(user.action, xSign, y + 36);
            if (user.note) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                const splitNote = doc.splitTextToSize(user.note, signWidth);
                doc.text(splitNote, xSign, y + 41);
            }
            xSign += signWidth + signSpacing;
        });

        doc.save(`PettyCash_${request.id}.pdf`);
    }

    downloadCashAdvancePdf(request: any) {
        const userIds = Array.from(new Set(request.history.map((h: any) => h.userId).filter((id: string) => !!id)));

        return this.settingsService.getSignatures(userIds as string[]).pipe(
            catchError(err => {
                console.error('Error fetching signatures', err);
                return of([]);
            }),
            map(signatures => {
                this.generateCashAdvancePdf(request, signatures);
                return true;
            })
        );
    }

    private generateCashAdvancePdf(request: any, signatureData: any[]) {
        const doc = new jsPDF();
        const margin = 20;
        let y = 30;

        doc.setFontSize(24);
        doc.setTextColor(0, 109, 78);
        doc.text('CASH ADVANCE VOUCHER', margin, y);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        y += 10;
        doc.text(`Voucher ID: ${request.id}`, margin, y);
        doc.text(`Date Created: ${new Date(request.createdAt).toLocaleDateString()}`, doc.internal.pageSize.width - margin - 50, y);

        y += 15;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, doc.internal.pageSize.width - margin, y);

        y += 15;
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('REQUEST DETAILS', margin, y);

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const col1 = margin;
        const col2 = margin + 80;
        doc.text(`Requestor: ${request.userName}`, col1, y);
        doc.text(`Department: ${request.department}`, col2, y);
        y += 7;
        doc.text(`Division: ${request.division}`, col1, y);
        doc.text(`Status: ${request.status}`, col2, y);
        y += 7;
        doc.text(`Currency: ${request.currency}`, col1, y);

        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIPTION:', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const splitDescription = doc.splitTextToSize(request.description || 'N/A', doc.internal.pageSize.width - (margin * 2));
        doc.text(splitDescription, margin, y);
        y += (splitDescription.length * 5) + 15;

        doc.setDrawColor(0, 109, 78);
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 5, doc.internal.pageSize.width - (margin * 2), 15, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 109, 78);
        const totalText = `TOTAL AMOUNT: ${request.total?.toLocaleString()} ${request.currency}`;
        doc.text(totalText, margin + 5, y + 5);

        y += 35;
        if (y + 60 > doc.internal.pageSize.height) { doc.addPage(); y = 30; }

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('APPROVALS & AUTHORIZATION', margin, y);
        y += 15;

        let xSign = margin;
        const signWidth = 45;
        const signSpacing = 12;

        const uniqueSignatures: any[] = Array.from(new Map(request.history
            .filter((h: any) => h.userId)
            .map((h: any) => {
                const userData = signatureData.find(s => s.id === h.userId);
                return [userData?.name || h.userName, {
                    name: userData?.name || h.userName,
                    role: userData?.role || 'Approver',
                    signature: userData?.signature,
                    action: h.action,
                    note: h.note
                }];
            })).values());

        uniqueSignatures.forEach((user: any) => {
            if (xSign + signWidth > doc.internal.pageSize.width - margin) { xSign = margin; y += 65; }
            if (y + 50 > doc.internal.pageSize.height) { doc.addPage(); y = 30; }
            if (user.signature) { try { doc.addImage(user.signature, 'PNG', xSign, y, signWidth, 18); } catch (e) { } }

            doc.setDrawColor(200, 200, 200);
            doc.line(xSign, y + 20, xSign + signWidth, y + 20);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(user.name, xSign, y + 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(user.role, xSign, y + 31);
            doc.text(user.action, xSign, y + 36);
            if (user.note) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                const splitNote = doc.splitTextToSize(user.note, signWidth);
                doc.text(splitNote, xSign, y + 41);
            }
            xSign += signWidth + signSpacing;
        });

        doc.save(`CashAdvance_${request.id}.pdf`);
    }

    downloadExpensePdf(request: any) {
        const userIds = Array.from(new Set(request.history.map((h: any) => h.userId).filter((id: string) => !!id)));

        return this.settingsService.getSignatures(userIds as string[]).pipe(
            catchError(err => {
                console.error('Error fetching signatures', err);
                return of([]);
            }),
            map(signatures => {
                this.generateExpensePdf(request, signatures);
                return true;
            })
        );
    }

    private generateExpensePdf(request: any, signatureData: any[]) {
        const doc = new jsPDF();
        const margin = 20;
        let y = 30;

        doc.setFontSize(24);
        doc.setTextColor(16, 185, 129);
        doc.text('EXPENSE CLAIM VOUCHER', margin, y);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        y += 10;
        doc.text(`Voucher ID: ${request.id}`, margin, y);
        doc.text(`Date Created: ${new Date(request.createdAt).toLocaleDateString()}`, doc.internal.pageSize.width - margin - 50, y);

        y += 15;
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, doc.internal.pageSize.width - margin, y);

        y += 15;
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('CLAIMANT DETAILS', margin, y);

        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const col1 = margin;
        const col2 = margin + 80;
        doc.text(`Claimant: ${request.userName}`, col1, y);
        doc.text(`Department: ${request.department}`, col2, y);
        y += 7;
        doc.text(`Division: ${request.division}`, col1, y);
        doc.text(`Status: ${request.status}`, col2, y);

        y += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('DESCRIPTION:', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        const splitDescription = doc.splitTextToSize(request.description || 'N/A', doc.internal.pageSize.width - (margin * 2));
        doc.text(splitDescription, margin, y);
        y += (splitDescription.length * 5) + 15;

        doc.setDrawColor(16, 185, 129);
        doc.setFillColor(240, 253, 244);
        doc.rect(margin, y - 5, doc.internal.pageSize.width - (margin * 2), 15, 'F');
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        const totalText = `TOTAL REIMBURSEMENT: ${request.amount?.toLocaleString()} ${request.currency}`;
        doc.text(totalText, margin + 5, y + 5);

        y += 35;
        if (y + 60 > doc.internal.pageSize.height) { doc.addPage(); y = 30; }

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('APPROVALS & AUTHORIZATION', margin, y);
        y += 15;

        let xSign = margin;
        const signWidth = 45;
        const signSpacing = 12;

        const uniqueSignatures: any[] = Array.from(new Map(request.history
            .filter((h: any) => h.userId)
            .map((h: any) => {
                const userData = signatureData.find(s => s.id === h.userId);
                return [userData?.name || h.userName, {
                    name: userData?.name || h.userName,
                    role: userData?.role || 'Approver',
                    signature: userData?.signature,
                    action: h.action,
                    note: h.note
                }];
            })).values());

        uniqueSignatures.forEach((user: any) => {
            if (xSign + signWidth > doc.internal.pageSize.width - margin) { xSign = margin; y += 65; }
            if (y + 50 > doc.internal.pageSize.height) { doc.addPage(); y = 30; }
            if (user.signature) { try { doc.addImage(user.signature, 'PNG', xSign, y, signWidth, 18); } catch (e) { } }
            doc.setDrawColor(200, 200, 200);
            doc.line(xSign, y + 20, xSign + signWidth, y + 20);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(user.name, xSign, y + 26);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(user.role, xSign, y + 31);
            doc.text(user.action, xSign, y + 36);
            if (user.note) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                const splitNote = doc.splitTextToSize(user.note, signWidth);
                doc.text(splitNote, xSign, y + 41);
            }
            xSign += signWidth + signSpacing;
        });

        doc.save(`ExpenseClaim_${request.id}.pdf`);
    }
}
