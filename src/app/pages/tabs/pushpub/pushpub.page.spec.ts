import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { TestSupportModule } from 'src/testing/test-support.module';

import { PushpubPage } from './pushpub.page';

describe('PushpubPage', () => {
  let component: PushpubPage;
  let fixture: ComponentFixture<PushpubPage>;

  const imageFile = (name: string) =>
    new File([new Uint8Array([0xff, 0xd8, 0xff])], name, {
      type: 'image/jpeg',
    });

  const preparePublishingSpies = () => {
    const loading = {
      message: '',
      present: jasmine.createSpy('present').and.resolveTo(),
      dismiss: jasmine.createSpy('dismiss').and.resolveTo(),
    };
    spyOn((component as any).loadingCtrl, 'create').and.resolveTo(loading as any);
    spyOn<any>(component, 'presentToast').and.resolveTo();
    spyOn((component as any).router, 'navigate').and.resolveTo(true);
    return loading;
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PushpubPage ],
      imports: [IonicModule.forRoot(), TestSupportModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PushpubPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uploads several images sequentially before creating the post', async () => {
    const files = [
      imageFile('one.jpg'),
      imageFile('two.jpg'),
      imageFile('three.jpg'),
    ];
    component.imageFiles = files;
    component.content = 'Multi-image post';
    const loading = preparePublishingSpies();
    const publishService = (component as any).publicationService;
    let activeUploads = 0;
    let maxActiveUploads = 0;

    spyOn(publishService, 'uploadImage').and.callFake(async (file: File) => {
      activeUploads += 1;
      maxActiveUploads = Math.max(maxActiveUploads, activeUploads);
      await Promise.resolve();
      activeUploads -= 1;
      return `/uploads/post/${file.name}.webp`;
    });
    const addPost = spyOn(publishService, 'addPost').and.resolveTo({
      id: 'post-id',
    });

    await component.addPost();

    expect(maxActiveUploads).toBe(1);
    expect(addPost).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        imageUrls: [
          '/uploads/post/one.jpg.webp',
          '/uploads/post/two.jpg.webp',
          '/uploads/post/three.jpg.webp',
        ],
      }),
    );
    expect(loading.message).toBeTruthy();
    expect(component.isPublishing).toBeFalse();
  });

  it('resumes at the failed image without uploading successful images again', async () => {
    const files = [
      imageFile('one.jpg'),
      imageFile('two.jpg'),
      imageFile('three.jpg'),
    ];
    component.imageFiles = files;
    component.content = 'Resumable post';
    preparePublishingSpies();
    const publishService = (component as any).publicationService;
    const attempts = new Map<string, number>();

    spyOn(publishService, 'uploadImage').and.callFake(async (file: File) => {
      const attempt = (attempts.get(file.name) || 0) + 1;
      attempts.set(file.name, attempt);
      if (file.name === 'two.jpg' && attempt === 1) {
        throw { status: 0 };
      }
      return `/uploads/post/${file.name}.webp`;
    });
    const addPost = spyOn(publishService, 'addPost').and.resolveTo({
      id: 'post-id',
    });

    await component.addPost();
    expect(addPost).not.toHaveBeenCalled();

    await component.addPost();

    expect(attempts.get('one.jpg')).toBe(1);
    expect(attempts.get('two.jpg')).toBe(2);
    expect(attempts.get('three.jpg')).toBe(1);
    expect(addPost).toHaveBeenCalledTimes(1);
  });

  it('rejects selections above the backend limit of eight images', () => {
    const toast = spyOn<any>(component, 'presentToast').and.resolveTo();
    const target = {
      files: Array.from({ length: 9 }, (_, index) => imageFile(`${index}.jpg`)),
      value: 'selected',
    };

    component.handleImageInput({ target });

    expect(component.imageFiles).toEqual([]);
    expect(toast).toHaveBeenCalled();
    expect(target.value).toBe('');
  });
});
