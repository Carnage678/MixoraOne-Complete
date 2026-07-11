import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateAnswerInput,
  CreateQuestionInput,
  QuestionRecord,
} from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class QnaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async listForProduct(productId: string): Promise<QuestionRecord[]> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Product not found');
    }

    const questions = await this.prisma.question.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        answers: {
          orderBy: { createdAt: 'asc' },
          include: { user: true },
        },
      },
    });

    return questions.map((question) => this.toRecord(question));
  }

  async createQuestion(
    userId: string,
    productId: string,
    input: CreateQuestionInput,
  ): Promise<QuestionRecord> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Product not found');
    }

    const question = await this.prisma.question.create({
      data: {
        productId,
        userId,
        title: input.title.trim(),
        body: input.body.trim(),
      },
      include: {
        user: true,
        answers: { include: { user: true } },
      },
    });

    await this.auditLog.record({
      action: 'question.created',
      userId,
      metadata: { questionId: question.id, productId },
    });

    return this.toRecord(question);
  }

  async createAnswer(
    userId: string,
    questionId: string,
    input: CreateAnswerInput,
  ): Promise<QuestionRecord> {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { product: true },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const profile = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (!profile || question.product.developerProfileId !== profile.id) {
      throw new ForbiddenException('Only the product developer can answer questions');
    }

    await this.prisma.answer.create({
      data: {
        questionId,
        userId,
        body: input.body.trim(),
      },
    });

    const updated = await this.prisma.question.findUniqueOrThrow({
      where: { id: questionId },
      include: {
        user: true,
        answers: {
          orderBy: { createdAt: 'asc' },
          include: { user: true },
        },
      },
    });

    await this.auditLog.record({
      action: 'question.answered',
      userId,
      metadata: { questionId, productId: question.productId },
    });

    return this.toRecord(updated);
  }

  private toRecord(question: {
    id: string;
    productId: string;
    userId: string;
    title: string;
    body: string;
    createdAt: Date;
    user: { name: string };
    answers: Array<{
      id: string;
      userId: string;
      body: string;
      createdAt: Date;
      user: { name: string };
    }>;
  }): QuestionRecord {
    return {
      id: question.id,
      productId: question.productId,
      userId: question.userId,
      userName: question.user.name,
      title: question.title,
      body: question.body,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        userId: answer.userId,
        userName: answer.user.name,
        body: answer.body,
        createdAt: answer.createdAt.toISOString(),
      })),
      createdAt: question.createdAt.toISOString(),
    };
  }
}
