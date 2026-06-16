import { ExpenseController } from "../../controllers/expense.controller.js";

export default async function expensesRoutes(fastify, opts) {
  fastify.post("/expenses", ExpenseController.create);
  fastify.get("/expenses/my", ExpenseController.getMy);
  fastify.get("/expenses/all", ExpenseController.getAll);
  fastify.put("/expenses/:id/status", ExpenseController.updateStatus);
  fastify.post("/expenses/:id/receipt", ExpenseController.uploadReceipt);
}
