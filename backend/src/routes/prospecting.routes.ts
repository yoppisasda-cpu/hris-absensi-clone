import { Router } from "express";
import { ProspectingController } from "../controllers/prospecting.controller";

const router = Router();

router.get("/competitors", ProspectingController.getCompetitors);
router.post("/competitors", ProspectingController.addCompetitor);
router.delete("/competitors/:id", ProspectingController.deleteCompetitor);
router.post("/advice", ProspectingController.getAdvice);

export default router;
