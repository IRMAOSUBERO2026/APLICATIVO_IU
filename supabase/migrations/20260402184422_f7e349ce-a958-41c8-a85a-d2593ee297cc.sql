
-- Tabela de eventos da agenda
CREATE TABLE public.eventos_agenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE,
  local TEXT,
  obra_id UUID REFERENCES public.obras(id),
  empresa_id UUID REFERENCES public.empresas(id),
  tipo TEXT NOT NULL DEFAULT 'compromisso',
  recorrente BOOLEAN NOT NULL DEFAULT false,
  recorrencia_tipo TEXT,
  responsaveis TEXT[],
  cor TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos_agenda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público eventos_agenda" ON public.eventos_agenda FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela de tarefas
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_limite DATE,
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'pendente',
  funcionario_id UUID REFERENCES public.funcionarios(id),
  atribuido_para UUID REFERENCES public.funcionarios(id),
  obra_id UUID REFERENCES public.obras(id),
  empresa_id UUID REFERENCES public.empresas(id),
  anexos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público tarefas" ON public.tarefas FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela de comentários de tarefas
CREATE TABLE public.tarefa_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  autor TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefa_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público tarefa_comentarios" ON public.tarefa_comentarios FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela de avisos/notificações
CREATE TABLE public.avisos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'normal',
  categoria TEXT NOT NULL DEFAULT 'geral',
  funcionario_id UUID REFERENCES public.funcionarios(id),
  obra_id UUID REFERENCES public.obras(id),
  empresa_id UUID REFERENCES public.empresas(id),
  lido BOOLEAN NOT NULL DEFAULT false,
  data_expiracao DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público avisos" ON public.avisos FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela de mensagens internas
CREATE TABLE public.mensagens_internas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remetente TEXT NOT NULL,
  destinatario_tipo TEXT NOT NULL DEFAULT 'funcionario',
  destinatario_id UUID,
  obra_id UUID REFERENCES public.obras(id),
  conteudo TEXT NOT NULL,
  anexo_url TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mensagens_internas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso público mensagens_internas" ON public.mensagens_internas FOR ALL TO public USING (true) WITH CHECK (true);
