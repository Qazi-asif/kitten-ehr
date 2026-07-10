import prisma from '../lib/prisma.js';
import { DEFAULT_AGREEMENT_TEMPLATES } from '../constants/defaultAgreementTemplates.js';
import { ensureAgreementTemplatesSeeded } from '../utils/contractAgreementText.js';

const VALID_TYPES = new Set(['FOSTER', 'ADOPTION']);

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export async function listContractTemplates(_req, res, next) {
  try {
    await ensureAgreementTemplatesSeeded();
    const templates = await prisma.contractTemplate.findMany({
      orderBy: [{ type: 'asc' }, { label: 'asc' }],
    });
    res.json(templates);
  } catch (error) {
    next(error);
  }
}

export async function getContractTemplateBySlug(req, res, next) {
  try {
    await ensureAgreementTemplatesSeeded();
    const template = await prisma.contractTemplate.findUnique({
      where: { slug: req.params.slug },
    });
    if (!template) return res.status(404).json({ error: 'Agreement template not found' });
    res.json(template);
  } catch (error) {
    next(error);
  }
}

export async function createContractTemplate(req, res, next) {
  try {
    const { slug, type, label, version, bodyText } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: 'label is required' });
    if (!bodyText?.trim()) return res.status(400).json({ error: 'bodyText is required' });
    if (!VALID_TYPES.has(type)) return res.status(400).json({ error: 'type must be FOSTER or ADOPTION' });

    const resolvedSlug = slug?.trim() ? slugify(slug) : slugify(label);
    if (!resolvedSlug) return res.status(400).json({ error: 'slug is required' });

    const existing = await prisma.contractTemplate.findUnique({ where: { slug: resolvedSlug } });
    if (existing) return res.status(409).json({ error: 'An agreement template with this slug already exists' });

    const template = await prisma.contractTemplate.create({
      data: {
        slug: resolvedSlug,
        type,
        label: label.trim(),
        version: version?.trim() || '2026.1',
        bodyText: bodyText.trim(),
      },
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
}

export async function updateContractTemplate(req, res, next) {
  try {
    const { slug } = req.params;
    const existing = await prisma.contractTemplate.findUnique({ where: { slug } });
    if (!existing) return res.status(404).json({ error: 'Agreement template not found' });

    const { label, version, bodyText, type } = req.body;
    const data = {};

    if (label !== undefined) {
      if (!label?.trim()) return res.status(400).json({ error: 'label is required' });
      data.label = label.trim();
    }
    if (version !== undefined) {
      if (!version?.trim()) return res.status(400).json({ error: 'version is required' });
      data.version = version.trim();
    }
    if (bodyText !== undefined) {
      if (!bodyText?.trim()) return res.status(400).json({ error: 'bodyText is required' });
      data.bodyText = bodyText.trim();
    }
    if (type !== undefined) {
      if (!VALID_TYPES.has(type)) return res.status(400).json({ error: 'type must be FOSTER or ADOPTION' });
      data.type = type;
    }

    const template = await prisma.contractTemplate.update({
      where: { slug },
      data,
    });

    res.json(template);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Agreement template not found' });
    next(error);
  }
}

export async function deleteContractTemplate(req, res, next) {
  try {
    const { slug } = req.params;
    const existing = await prisma.contractTemplate.findUnique({ where: { slug } });
    if (!existing) return res.status(404).json({ error: 'Agreement template not found' });

    const isDefault = DEFAULT_AGREEMENT_TEMPLATES.some((template) => template.slug === slug);
    if (isDefault) {
      return res.status(400).json({ error: 'Default agreement templates cannot be deleted. Edit the template instead.' });
    }

    const inUse = await prisma.contract.count({ where: { templateSlug: slug } });
    if (inUse > 0) {
      return res.status(400).json({ error: 'This template is linked to existing contracts and cannot be deleted.' });
    }

    await prisma.contractTemplate.delete({ where: { slug } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Agreement template not found' });
    next(error);
  }
}

export async function resetContractTemplate(req, res, next) {
  try {
    const { slug } = req.params;
    const fallback = DEFAULT_AGREEMENT_TEMPLATES.find((template) => template.slug === slug);
    if (!fallback) {
      return res.status(400).json({ error: 'Only default agreement templates can be reset' });
    }

    const template = await prisma.contractTemplate.upsert({
      where: { slug },
      update: {
        label: fallback.label,
        type: fallback.type,
        version: fallback.version,
        bodyText: fallback.bodyText,
      },
      create: {
        slug: fallback.slug,
        type: fallback.type,
        label: fallback.label,
        version: fallback.version,
        bodyText: fallback.bodyText,
      },
    });

    res.json(template);
  } catch (error) {
    next(error);
  }
}
