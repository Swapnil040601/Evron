import { ExpenseService } from "../services/expense.service.js";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

export const ExpenseController = {
  create: async (req, reply) => {
    try {
      const expense = await ExpenseService.create(req.db, req.user.id, req.body || {});
      return expense;
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to create expense" });
    }
  },

  getMy: async (req, reply) => {
    try {
      return await ExpenseService.getMy(req.db, req.user.id);
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to fetch expenses" });
    }
  },

  getAll: async (req, reply) => {
    try {
      const filters = req.query || {};
      return await ExpenseService.getAll(req.db, filters);
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to fetch expenses" });
    }
  },

  updateStatus: async (req, reply) => {
    try {
      const { id } = req.params;
      const { status, admin_note } = req.body || {};
      if (!['Approved', 'Rejected'].includes(status)) {
        return reply.code(400).send({ message: "status must be Approved or Rejected" });
      }
      const updated = await ExpenseService.updateStatus(req.db, id, status, admin_note, req.user.id);
      if (!updated) return reply.code(404).send({ message: "Expense not found" });
      return updated;
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Failed to update expense" });
    }
  },

  uploadReceipt: async (req, reply) => {
    try {
      const { id } = req.params;
      const data = await req.file();
      if (!data) return reply.code(400).send({ message: "No file uploaded" });

      const ext = path.extname(data.filename) || '.jpg';
      const fileName = `receipts/expense_${id}_${Date.now()}${ext}`;
      const fullPath = path.join(UPLOAD_DIR, fileName);

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, await data.toBuffer());

      const updated = await ExpenseService.uploadReceipt(req.db, id, req.user.id, fileName);
      return { receipt_path: fileName, expense: updated };
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ message: "Receipt upload failed" });
    }
  }
};
