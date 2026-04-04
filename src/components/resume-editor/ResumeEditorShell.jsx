import './resumeEditor.css';
import EditorBreadcrumb from './EditorBreadcrumb.jsx';
import EditorTabBar from './EditorTabBar.jsx';
import ResumeContentTab from './ResumeContentTab.jsx';
import AIAssistantTab from './AIAssistantTab.jsx';
import DesignTab from './DesignTab.jsx';
import ResumePreview from './ResumePreview.jsx';
import QuickActionsPanel from './QuickActionsPanel.jsx';
import ScorePanel from './ScorePanel.jsx';
import TailorJobModal from './TailorJobModal.jsx';
import { computeResumeScore } from './editorUtils.js';

export default function ResumeEditorShell(props) {
  const {
    resumeId,
    resumeTitle,
    setResumeTitle,
    editorTab,
    setEditorTab,
    profile,
    previewMode,
    setPreviewMode,
    previewLoading,
    previewUrl,
    customization,
    setCustomization,
    templates,
    selectedTemplate,
    setSelectedTemplate,
    updateProfile,
    patchProfessional,
    patchEducation,
    expandedSectionId,
    setExpandedSectionId,
    dragOrder,
    onDragOrderChange,
    workExpIndex,
    setWorkExpIndex,
    educationIndex,
    setEducationIndex,
    handleDownload,
    downloading,
    isFreePlanUser,
    tailorOpen,
    setTailorOpen,
    tailorJobTitle,
    setTailorJobTitle,
    tailorCompany,
    setTailorCompany,
    jd,
    setJd,
    onTailorSubmit,
    tailorLoading,
    scorePanelOpen,
    setScorePanelOpen,
    menuOpen,
    setMenuOpen,
    onBreadcrumbDuplicate,
    onBreadcrumbDelete,
    onBreadcrumbShare,
    onBreadcrumbExport,
    centerDiffContent,
    styleSettingsOpen,
    setStyleSettingsOpen,
  } = props;

  const { total } = computeResumeScore(profile);
  const design = {
    fontFamily: customization.fontFamily,
    fontSizePt: customization.fontSizePt ?? 11,
    lineHeight: customization.lineHeight ?? 1.125,
    marginLR: customization.marginLR ?? 0.39,
    marginTB: customization.marginTB ?? 0.39,
    accentColor: customization.accentColor || customization.primaryColor || '#2563eb',
    paperSize: customization.paperSize || 'a4',
  };

  return (
    <div className="re-root">
      <EditorBreadcrumb
        resumeTitle={resumeTitle}
        onRename={setResumeTitle}
        onTailor={() => setTailorOpen(true)}
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={isFreePlanUser}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onDuplicate={onBreadcrumbDuplicate}
        onDelete={onBreadcrumbDelete}
        onShare={onBreadcrumbShare}
        onExport={onBreadcrumbExport}
        onCopyLink={() => {
          const u = window.location.href;
          navigator.clipboard?.writeText(u).catch(() => {});
        }}
      />
      <div className="re-body">
        <div className="re-left">
          <EditorTabBar active={editorTab} onChange={setEditorTab} />
          {editorTab === 'content' && (
            <ResumeContentTab
              profile={profile}
              updateProfile={updateProfile}
              patchProfessional={patchProfessional}
              patchEducation={patchEducation}
              expandedId={expandedSectionId}
              setExpandedId={setExpandedSectionId}
              dragOrder={dragOrder}
              onDragOrderChange={onDragOrderChange}
              workExpIndex={workExpIndex}
              setWorkExpIndex={setWorkExpIndex}
              educationIndex={educationIndex}
              setEducationIndex={setEducationIndex}
            />
          )}
          {editorTab === 'ai' && (
            <div className="re-left-scroll re-left-scroll--ai">
              <AIAssistantTab profile={profile} resumeId={resumeId} />
            </div>
          )}
          {editorTab === 'design' && (
            <DesignTab
              design={customization}
              setDesign={setCustomization}
              templates={templates}
              selectedTemplate={selectedTemplate}
              onTemplateChange={setSelectedTemplate}
              styleOpen={styleSettingsOpen}
              setStyleOpen={setStyleSettingsOpen}
            />
          )}
        </div>
        <div className="re-center">
          <div className="re-preview-toolbar">
            <div className="re-preview-toggle" role="group" aria-label="Preview mode">
              <button
                type="button"
                className={`re-preview-pill${previewMode === 'pdf' ? ' re-preview-pill--resume-on' : ' re-preview-pill--muted'}`}
                onClick={() => setPreviewMode('pdf')}
              >
                Resume
              </button>
              <button
                type="button"
                className={`re-preview-pill${previewMode === 'diff' ? ' re-preview-pill--diff-on' : ' re-preview-pill--muted'}`}
                onClick={() => setPreviewMode('diff')}
              >
                AI diff
              </button>
            </div>
          </div>
          <div className="re-center-scroll">
            {previewMode === 'pdf' && (
              <>
                {previewLoading && (
                  <div style={{ marginBottom: 8, fontSize: 13, color: '#2563eb', fontWeight: 600 }}>Updating PDF preview…</div>
                )}
                <ResumePreview profile={profile} design={design} paperSize={design.paperSize} />
                {previewUrl && (
                  <details style={{ marginTop: 16, maxWidth: 820, width: '100%' }}>
                    <summary style={{ cursor: 'pointer', fontSize: 13, color: '#64748b' }}>Server PDF preview (ATS)</summary>
                    <iframe
                      title="PDF"
                      src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                      style={{ width: '100%', height: 480, border: '1px solid #e2e8f0', marginTop: 8, borderRadius: 8 }}
                    />
                  </details>
                )}
              </>
            )}
            {previewMode === 'diff' && centerDiffContent}
          </div>
        </div>
        <div className="re-right">
          <QuickActionsPanel
            scoreValue={total}
            skillMatchValue={0}
            onScoreClick={() => setScorePanelOpen(true)}
            onSkillClick={() => window.alert('Skill match is available after you target a job (Tailor for Job).')}
            onCommentsClick={() => window.alert('Comments coming soon.')}
          />
        </div>
      </div>
      <ScorePanel open={scorePanelOpen} onClose={() => setScorePanelOpen(false)} profile={profile} />
      <TailorJobModal
        open={tailorOpen}
        onClose={() => setTailorOpen(false)}
        jobTitle={tailorJobTitle}
        setJobTitle={setTailorJobTitle}
        companyName={tailorCompany}
        setCompanyName={setTailorCompany}
        jobDescription={jd}
        setJobDescription={setJd}
        onSubmit={onTailorSubmit}
        loading={tailorLoading}
      />
    </div>
  );
}
